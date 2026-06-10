import type { Config } from '@/types/engine'
import type { ComparisonResponse } from '@/types/api'

// Thin typed wrappers around the JSON API. The types come from
// src/types/, which is generated from the Go structs (single source of
// truth); nothing here redefines a shape.

async function requestJSON<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${body}`)
  }
  return response.json() as Promise<T>
}

export function fetchDefaultConfig(): Promise<Config> {
  return requestJSON<Config>('/api/config/default')
}

export function runComparison(config: Config): Promise<ComparisonResponse> {
  return requestJSON<ComparisonResponse>('/api/comparison', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
}
