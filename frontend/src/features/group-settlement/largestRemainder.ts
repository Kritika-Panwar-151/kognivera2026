/**
 * Largest Remainder Algorithm (Hamilton-Hare)
 * Guarantees zero-drift cent integer allocation.
 */
export function calculateLargestRemainderSplit(totalAmount: number, numAdults: number): number[] {
  if (numAdults <= 0) return []
  const totalCents = Math.round(totalAmount * 100)
  const baseShareCents = Math.floor(totalCents / numAdults)
  const remainderCents = totalCents - baseShareCents * numAdults

  const shares: number[] = []
  for (let i = 0; i < numAdults; i++) {
    const centBonus = i < remainderCents ? 1 : 0
    shares.push((baseShareCents + centBonus) / 100)
  }
  return shares
}
