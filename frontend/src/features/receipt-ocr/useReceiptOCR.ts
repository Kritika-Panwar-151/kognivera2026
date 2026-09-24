import { useState } from 'react'

export interface ExtractedFields {
  merchant: string
  amount: string
  currency: string
  date: string
  category: string
  isShared: boolean
}

export function useReceiptOCR() {
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)

  const [fields, setFields] = useState<ExtractedFields>({
    merchant: 'Restaurant Milano',
    amount: '42.00',
    currency: 'EUR',
    date: '2026-09-15',
    category: 'Food',
    isShared: true,
  })

  const startScan = (onComplete: () => void) => {
    setIsScanning(true)
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 22 + 8
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setTimeout(() => {
          setIsScanning(false)
          onComplete()
        }, 500)
      }
      setProgress(Math.min(Math.round(p), 100))
    }, 180)
  }

  const updateField = (field: keyof ExtractedFields, value: any) => {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  const numAmount = parseFloat(fields.amount || '0')
  const rate = fields.currency === 'EUR' ? 94 : fields.currency === 'USD' ? 86.5 : 1
  const converted = Math.round(numAmount * rate)

  return {
    isScanning,
    progress,
    fields,
    startScan,
    updateField,
    converted,
    rate,
  }
}
