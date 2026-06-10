import { reactive } from 'vue'
import { useSimStore } from './useSimStore'

// Node hover state (spec 5.5). The hovered student index lives in the sim
// store so every panel can draw the cross-panel echo ring; the tooltip
// additionally needs which panel is being pointed at and where.

interface NodeHoverPosition {
  panelId: string | null
  clientX: number
  clientY: number
}

const hoverPosition = reactive<NodeHoverPosition>({ panelId: null, clientX: 0, clientY: 0 })

export function useNodeHover() {
  const store = useSimStore()

  function setHoveredNode(panelId: string, nodeIndex: number, event: MouseEvent) {
    store.state.hoveredNode = nodeIndex
    hoverPosition.panelId = panelId
    hoverPosition.clientX = event.clientX
    hoverPosition.clientY = event.clientY
  }

  function moveHoveredNode(event: MouseEvent) {
    hoverPosition.clientX = event.clientX
    hoverPosition.clientY = event.clientY
  }

  function clearHoveredNode() {
    store.state.hoveredNode = null
    hoverPosition.panelId = null
  }

  return { hoverPosition, setHoveredNode, moveHoveredNode, clearHoveredNode }
}
