import { NETWORK_VIEW_HEIGHT, NETWORK_VIEW_WIDTH } from '@/composables/useLayout'
import type { SimStore } from '@/composables/useSimStore'
import { accentForPanel } from '@/lib/accents'
import { roundPct } from '@/lib/format'
import { reachedCountDisplayed } from '@/lib/reach'

// Export (spec 5.9). JSON and CSV come straight from store state; the PNG
// snapshot serializes each panel's live SVG (CSS variables resolved to the
// current theme's colors), draws them side by side with labels and
// percentages at the current round, and appends the legend and the
// disclaimer footer line, all at 2x resolution.

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function exportJson(store: SimStore) {
  const payload = {
    base: store.state.base,
    panels: store.state.panels,
    results: store.state.resultsByPanelId,
  }
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    'spreadlab-export.json',
  )
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function exportCsv(store: SimStore) {
  const lines = ['panel,label,node,educated,reachedAtRound']
  store.state.panels.forEach((panel, panelIndex) => {
    const result = store.state.resultsByPanelId[panel.id]
    if (!result) return
    const educatedNodes = new Set(result.educated)
    result.reachedAtRound.forEach((reachedAt, node) => {
      lines.push(
        `${panelIndex},${csvCell(panel.label)},${node},${educatedNodes.has(node)},${reachedAt}`,
      )
    })
  })
  downloadBlob(new Blob([`${lines.join('\n')}\n`], { type: 'text/csv' }), 'spreadlab-nodes.csv')
}

// ---------- PNG snapshot ----------

const PNG_SCALE = 2
const PANEL_WIDTH = NETWORK_VIEW_WIDTH * PNG_SCALE
const PANEL_HEIGHT = NETWORK_VIEW_HEIGHT * PNG_SCALE
const PAGE_PADDING = 48
const PANEL_GAP = 32
const HEADER_HEIGHT = 64
const LEGEND_HEIGHT = 56
const FOOTER_HEIGHT = 52

const TOKEN_NAMES = [
  '--bg',
  '--surface',
  '--border',
  '--edge',
  '--unreached',
  '--spread',
  '--edu',
  '--ink',
  '--ink-2',
  '--ink-3',
  '--ink-4',
] as const

function resolveThemeTokens(): Record<string, string> {
  const rootStyle = getComputedStyle(document.documentElement)
  const tokens: Record<string, string> = {}
  for (const name of TOKEN_NAMES) tokens[name] = rootStyle.getPropertyValue(name).trim()
  return tokens
}

function svgToImage(
  svgElement: SVGSVGElement,
  tokens: Record<string, string>,
): Promise<HTMLImageElement> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', `${PANEL_WIDTH}`)
  clone.setAttribute('height', `${PANEL_HEIGHT}`)
  const markup = new XMLSerializer()
    .serializeToString(clone)
    .replace(/var\((--[a-z0-9-]+)\)/g, (_, tokenName: string) => tokens[tokenName] ?? '#000000')
  const image = new Image()
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  })
}

const FONT_STACK = "'Inter Variable', Inter, system-ui, sans-serif"

export async function exportPng(store: SimStore): Promise<void> {
  const tokens = resolveThemeTokens()
  const panelsWithSvg = store.state.panels.flatMap((panel, panelIndex) => {
    const svgElement = document.querySelector<SVGSVGElement>(`#panel-${panel.id} svg.net`)
    const result = store.state.resultsByPanelId[panel.id]
    return svgElement && result ? [{ panel, panelIndex, svgElement, result }] : []
  })
  if (panelsWithSvg.length === 0) return

  const images = await Promise.all(
    panelsWithSvg.map(({ svgElement }) => svgToImage(svgElement, tokens)),
  )

  const panelCount = panelsWithSvg.length
  const width = 2 * PAGE_PADDING + panelCount * PANEL_WIDTH + (panelCount - 1) * PANEL_GAP
  const height =
    PAGE_PADDING +
    HEADER_HEIGHT +
    PANEL_HEIGHT +
    20 +
    LEGEND_HEIGHT +
    FOOTER_HEIGHT +
    PAGE_PADDING / 2
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = tokens['--bg'] ?? '#ffffff'
  ctx.fillRect(0, 0, width, height)

  panelsWithSvg.forEach(({ panel, panelIndex, result }, drawIndex) => {
    const x = PAGE_PADDING + drawIndex * (PANEL_WIDTH + PANEL_GAP)
    const numStudents = store.effectiveConfig(panel).numStudents
    const pctNow =
      (reachedCountDisplayed(result.reachedAtRound, store.state.round, store.state.roundProgress) /
        numStudents) *
      100

    // Header: accent swatch, label, percentage at the current round.
    ctx.fillStyle = accentForPanel(panelIndex)
    ctx.beginPath()
    ctx.roundRect(x, PAGE_PADDING + 8, 18, 18, 5)
    ctx.fill()
    ctx.fillStyle = tokens['--ink-2'] ?? '#333'
    ctx.font = `600 26px ${FONT_STACK}`
    ctx.textBaseline = 'middle'
    ctx.fillText(panel.label, x + 30, PAGE_PADDING + 18, PANEL_WIDTH - 140)
    const pctLabel = `${roundPct(pctNow)}%`
    ctx.fillStyle =
      roundPct(pctNow) <= store.preset.toneThresholdPct
        ? (tokens['--edu'] ?? '#14b8a6')
        : (tokens['--spread'] ?? '#f43f5e')
    ctx.font = `700 32px ${FONT_STACK}`
    ctx.textAlign = 'right'
    ctx.fillText(pctLabel, x + PANEL_WIDTH, PAGE_PADDING + 18)
    ctx.textAlign = 'left'

    const image = images[drawIndex]
    if (image) ctx.drawImage(image, x, PAGE_PADDING + HEADER_HEIGHT, PANEL_WIDTH, PANEL_HEIGHT)
  })

  // Legend row.
  const legendY = PAGE_PADDING + HEADER_HEIGHT + PANEL_HEIGHT + 20 + LEGEND_HEIGHT / 2
  let legendX = PAGE_PADDING
  ctx.font = `500 22px ${FONT_STACK}`
  const legendEntries: { draw: (cx: number, cy: number) => void; text: string }[] = [
    {
      text: 'Forwarded the fake',
      draw: (cx, cy) => {
        ctx.fillStyle = tokens['--spread'] ?? '#f43f5e'
        ctx.beginPath()
        ctx.arc(cx, cy, 9, 0, Math.PI * 2)
        ctx.fill()
      },
    },
    {
      text: 'Educated to refuse',
      draw: (cx, cy) => {
        ctx.strokeStyle = tokens['--edu'] ?? '#14b8a6'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(cx, cy, 7, 0, Math.PI * 2)
        ctx.stroke()
      },
    },
    {
      text: 'Not reached',
      draw: (cx, cy) => {
        ctx.fillStyle = tokens['--unreached'] ?? '#d8dfe9'
        ctx.beginPath()
        ctx.arc(cx, cy, 9, 0, Math.PI * 2)
        ctx.fill()
      },
    },
    {
      text: 'Origin',
      draw: (cx, cy) => {
        ctx.strokeStyle = tokens['--spread'] ?? '#f43f5e'
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.stroke()
      },
    },
  ]
  for (const entry of legendEntries) {
    entry.draw(legendX + 9, legendY)
    ctx.fillStyle = tokens['--ink-3'] ?? '#64748b'
    ctx.fillText(entry.text, legendX + 28, legendY)
    legendX += 28 + ctx.measureText(entry.text).width + 44
  }

  // Disclaimer footer line, always part of the picture (spec 5.12).
  const footerY = legendY + LEGEND_HEIGHT / 2 + FOOTER_HEIGHT / 2
  ctx.fillStyle = tokens['--ink-4'] ?? '#94a3b8'
  ctx.font = `italic 500 22px ${FONT_STACK}`
  ctx.fillText(
    'Illustrative (not validated output) · an agent-based toy model, parameters chosen for clarity',
    PAGE_PADDING,
    footerY,
  )
  ctx.textAlign = 'right'
  ctx.font = `500 22px ${FONT_STACK}`
  ctx.fillText('spreadlab', width - PAGE_PADDING, footerY)
  ctx.textAlign = 'left'

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (blob) downloadBlob(blob, 'spreadlab.png')
}
