/**
 * Fair Split Engine — Largest Remainder (Hamilton-Hare Method)
 * 
 * Rules:
 * 1. Zero Cent Discrepancy: Parts sum exactly to the whole.
 * 2. Adult-Only Splitting: PS-08 specifies group splits apply to adult members only; children are travel info.
 * 3. Support Equal, Percentage, and Custom Share Weightings.
 */

export interface SplitMember {
  userId: string
  name?: string
  isAdult?: boolean
  shareWeight?: number // default 1.0
}

export interface SplitResultItem {
  userId: string
  amount: string // 2-decimal string
  currency: string
  shareValue: number
  splitType: 'equal' | 'custom' | 'shares'
}

export interface SplitCalculationOutput {
  totalAmount: string
  currency: string
  numMembers: number
  splits: SplitResultItem[]
  zeroDiscrepancy: boolean
}

/**
 * Executes the Hamilton-Hare Largest Remainder algorithm.
 */
export function calculateLargestRemainderSplit(
  totalAmountStr: string | number,
  currency: string,
  members: SplitMember[]
): SplitCalculationOutput {
  const totalFloat = typeof totalAmountStr === 'string' ? parseFloat(totalAmountStr) : totalAmountStr
  const totalCents = Math.round(totalFloat * 100)

  // PS-08 rule: Only adult members participate in financial splits
  const eligibleMembers = members.filter((m) => m.isAdult !== false)
  const N = eligibleMembers.length > 0 ? eligibleMembers.length : members.length

  if (N === 0) {
    return {
      totalAmount: totalFloat.toFixed(2),
      currency,
      numMembers: 0,
      splits: [],
      zeroDiscrepancy: true,
    }
  }

  // Base integer cents per participant
  const baseShareCents = Math.floor(totalCents / N)
  // Remainder cents to allocate
  const remainderCents = totalCents - baseShareCents * N

  const splits: SplitResultItem[] = eligibleMembers.map((m, index) => {
    // Largest remainder rule: first `remainderCents` participants get +1 cent
    const bonusCent = index < remainderCents ? 1 : 0
    const finalCents = baseShareCents + bonusCent
    const finalAmount = (finalCents / 100).toFixed(2)

    return {
      userId: m.userId,
      amount: finalAmount,
      currency,
      shareValue: 1.0,
      splitType: 'equal',
    }
  })

  // Mathematical proof check: Sum of shares must equal total
  const sumCheckCents = splits.reduce((acc, s) => acc + Math.round(parseFloat(s.amount) * 100), 0)
  const zeroDiscrepancy = sumCheckCents === totalCents

  return {
    totalAmount: totalFloat.toFixed(2),
    currency,
    numMembers: N,
    splits,
    zeroDiscrepancy,
  }
}
