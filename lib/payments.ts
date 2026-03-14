export function calculateMonthlyPayment(principal: number, annualApr: number, termMonths: number) {
  if (termMonths <= 0) return 0
  const monthlyRate = annualApr > 0 ? annualApr / 100 / 12 : 0
  if (monthlyRate === 0) return principal / termMonths
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
}

export function addMonths(date: Date, count: number) {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + count)
  return copy
}
