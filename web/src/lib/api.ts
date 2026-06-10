import type { Config } from '@/types/engine'
import type { ComparisonResponse, ScenarioRequest, ScenarioResponse } from '@/types/api'

// Thin typed wrappers around the JSON API. The types come from
// src/types/, which is generated from the Go structs (single source of
// truth); nothing here redefines a shape.

// The API answers invalid input with 400 and {"error": "..."}; carrying the
// status lets the store route engine validation errors to the inline spot
// under the controls instead of the error banner.
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function apiErrorMessage(response: Response, body: string): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof parsed.error === 'string'
    ) {
      return parsed.error
    }
  } catch {
    // not JSON; fall through to the status line
  }
  return `${response.status} ${response.statusText}${body ? `: ${body}` : ''}`
}

async function requestJSON<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(response.status, apiErrorMessage(response, body))
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

export function runScenario(request: ScenarioRequest): Promise<ScenarioResponse> {
  return requestJSON<ScenarioResponse>('/api/scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}
