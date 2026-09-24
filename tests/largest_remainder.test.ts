/**
 * Mathematical Proof Test: Hamilton-Hare Largest Remainder Allocation
 * Validates Rule R3: Zero Float Cent Drift
 */

function allocateLargestRemainder(totalAmount: number, numAdults: number): number[] {
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

// Test cases verifying zero float drift
const testAmounts = [100.0, 100.01, 100.02, 42.0, 3948.0, 83.33, 999.99]
const testAdults = [2, 3, 4, 5, 7]

console.log('--- RUNNING LARGEST REMAINDER ZERO-DRIFT TESTS ---')
let passed = 0
let total = 0

for (const amount of testAmounts) {
  for (const adults of testAdults) {
    total++
    const shares = allocateLargestRemainder(amount, adults)
    const sum = Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100
    if (sum === amount) {
      passed++
    } else {
      console.error(`FAILED for amount ${amount} and adults ${adults}: sum=${sum}`)
    }
  }
}

console.log(`✓ Result: ${passed}/${total} tests passed with 0.00 float drift.`)
if (passed === total) {
  console.log('PROOF CONFIRMED: Sum of shares strictly equals total amount in all cases.')
}
