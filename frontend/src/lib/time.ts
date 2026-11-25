export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(fallback)
      }
    }, ms)

    promise.then(
      (value) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(value)
        }
      },
      () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(fallback)
        }
      },
    )
  })
}
