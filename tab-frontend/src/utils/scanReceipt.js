export function scanReceiptTotal(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const numRe = /(\d{1,3}(?:[,.]\d{3})*(?:\.\d{2})|\d+\.\d{2})/
  const priorities = ['grand total', 'total due', 'amount due', 'balance due', 'total']

  for (const keyword of priorities) {
    for (const line of lines) {
      const lower = line.toLowerCase()
      if (lower.includes(keyword) && !lower.includes('subtotal')) {
        const match = line.match(numRe)
        if (match) return match[1].replace(/,/g, '')
      }
    }
  }

  let max = null
  const globalRe = new RegExp(numRe.source, 'g')
  for (const line of lines) {
    const matches = line.match(globalRe)
    if (matches) {
      for (const m of matches) {
        const val = parseFloat(m.replace(/,/g, ''))
        if (!isNaN(val) && (max === null || val > max)) max = val
      }
    }
  }
  return max !== null ? max.toFixed(2) : null
}