const safeMethods = new Set(["GET", "HEAD", "OPTIONS"])

export function getTrustedOrigins() {
  const origins = new Set<string>()
  const envOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.AUTH_ORIGIN,
  ]

  for (const value of envOrigins) {
    if (!value) continue
    try {
      origins.add(new URL(value).origin)
    } catch {
      // Ignore malformed origins.
    }
  }

  return origins
}

export function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase()
  if (safeMethods.has(method)) return

  const originHeader = req.headers.get("origin")
  if (!originHeader) {
    throw new Error("CSRF_INVALID_ORIGIN")
  }

  let requestOrigin: string
  try {
    requestOrigin = new URL(req.url).origin
  } catch {
    throw new Error("CSRF_INVALID_ORIGIN")
  }

  let incomingOrigin: string
  try {
    incomingOrigin = new URL(originHeader).origin
  } catch {
    throw new Error("CSRF_INVALID_ORIGIN")
  }

  const trustedOrigins = getTrustedOrigins()
  if (incomingOrigin === requestOrigin || trustedOrigins.has(incomingOrigin)) {
    return
  }

  throw new Error("CSRF_INVALID_ORIGIN")
}
