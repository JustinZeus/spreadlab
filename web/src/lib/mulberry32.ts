// Deterministic 32-bit PRNG (spec section 6). The force layout must come
// out identical on every machine so a shared URL reproduces the exact
// picture; Math.random would break that guarantee.
export function mulberry32(seed: number): () => number {
  let stateWord = seed | 0
  return () => {
    stateWord = (stateWord + 0x6d2b79f5) | 0
    let mixed = Math.imul(stateWord ^ (stateWord >>> 15), 1 | stateWord)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
