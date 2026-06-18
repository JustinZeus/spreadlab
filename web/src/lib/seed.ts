// Seeds are just names for a random world. A small range (0-9999) keeps the
// fields and shared URLs readable while still giving plenty of distinct
// worlds (amended 2026-06-10: a full uint32 made fields and URLs unreadable).
export function freshSeed(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return (buffer[0] ?? 0) % 10000
}
