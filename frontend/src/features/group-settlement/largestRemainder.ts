/**
 * Largest Remainder Algorithm (Hamilton-Hare Quota)
 * Guarantees zero-drift cent/paisa integer allocation for fair group expense splits.
 */
export function calculateLargestRemainderSplit(totalAmount: number, numPeople: number): number[] {
  if (numPeople <= 0) return []
  const totalCents = Math.round(totalAmount * 100)
  const baseShareCents = Math.floor(totalCents / numPeople)
  const remainderCents = totalCents - baseShareCents * numPeople

  const shares: number[] = []
  for (let i = 0; i < numPeople; i++) {
    const centBonus = i < remainderCents ? 1 : 0
    shares.push((baseShareCents + centBonus) / 100)
  }
  return shares
}

/**
 * Hamilton-Hare Member Breakdown Generator
 * Maps exact zero-drift shares to named group members.
 */
export function calculateHareMemberBreakdown(
  totalAmount: number,
  members: string[]
): Record<string, number> {
  if (!members || members.length === 0) return {}
  const shares = calculateLargestRemainderSplit(totalAmount, members.length)
  const breakdown: Record<string, number> = {}
  members.forEach((member, idx) => {
    breakdown[member] = shares[idx] || 0
  })
  return breakdown
}
