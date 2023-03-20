const generatePrimes = (n: number): number[] => {
  const primes: number[] = []

  let currentNum = 2
  while (primes.length < n) {
    let isPrime = true
    for (let i = 2; i <= Math.sqrt(currentNum); i++) {
      if (currentNum % i === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) {
      primes.push(currentNum)
    }
    currentNum++
  }

  return primes
}

export default generatePrimes
