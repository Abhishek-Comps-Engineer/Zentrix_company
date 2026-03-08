import { createRemoteJWKSet, jwtVerify } from "jose"

const GOOGLE_AUTH_CONFIG_PREFIX = "GOOGLE_AUTH_CONFIG:"
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
)

type GoogleTokenResponse = {
  access_token?: string
  id_token?: string
  expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

type VerifiedGoogleProfile = {
  googleId: string
  email: string
  name: string
  emailVerified: boolean
}

function resolveRedirectUri(req?: Request) {
  const configured =
    process.env.GOOGLE_OAUTH_REDIRECT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL

  if (configured) {
    const parsed = new URL(configured)
    if (parsed.pathname === "/api/auth/google/callback") {
      return parsed.toString()
    }
    return `${parsed.origin}/api/auth/google/callback`
  }

  if (!req) {
    throw new Error(
      `${GOOGLE_AUTH_CONFIG_PREFIX} GOOGLE_OAUTH_REDIRECT_BASE_URL or NEXT_PUBLIC_APP_URL is required`
    )
  }

  return `${new URL(req.url).origin}/api/auth/google/callback`
}

export function getGoogleOAuthConfig(req?: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = resolveRedirectUri(req)

  if (!clientId) {
    throw new Error(`${GOOGLE_AUTH_CONFIG_PREFIX} GOOGLE_CLIENT_ID is required`)
  }
  if (!clientSecret) {
    throw new Error(`${GOOGLE_AUTH_CONFIG_PREFIX} GOOGLE_CLIENT_SECRET is required`)
  }

  return { clientId, clientSecret, redirectUri }
}

export function isGoogleAuthConfigError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith(GOOGLE_AUTH_CONFIG_PREFIX)
  )
}

export function hasGoogleOAuthConfig() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function sanitizeCallbackUrl(raw: string | null | undefined) {
  if (!raw) return "/dashboard"
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard"
  return raw
}

export function buildGoogleAuthUrl(input: {
  req: Request
  state: string
  nonce: string
}) {
  const { clientId, redirectUri } = getGoogleOAuthConfig(input.req)

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("state", input.state)
  url.searchParams.set("nonce", input.nonce)
  url.searchParams.set("prompt", "select_account")
  url.searchParams.set("access_type", "online")
  return url.toString()
}

export async function exchangeGoogleCodeForTokens(input: {
  req: Request
  code: string
}) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(input.req)

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = (await response.json()) as GoogleTokenResponse
  if (!response.ok || !data.id_token) {
    throw new Error(
      `GOOGLE_OAUTH_TOKEN_ERROR:${data.error || "unknown"}:${data.error_description || "No description"}`
    )
  }

  return data
}

export async function verifyGoogleIdToken(input: {
  req: Request
  idToken: string
  expectedNonce: string
}): Promise<VerifiedGoogleProfile> {
  const { clientId } = getGoogleOAuthConfig(input.req)

  const { payload } = await jwtVerify(input.idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  })

  const sub = typeof payload.sub === "string" ? payload.sub : null
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null
  const name = typeof payload.name === "string" ? payload.name : null
  const nonce = typeof payload.nonce === "string" ? payload.nonce : null
  const emailVerified = payload.email_verified === true

  if (!sub || !email || !name || !nonce) {
    throw new Error("GOOGLE_OAUTH_PROFILE_INVALID")
  }
  if (nonce !== input.expectedNonce) {
    throw new Error("GOOGLE_OAUTH_NONCE_INVALID")
  }

  return {
    googleId: sub,
    email,
    name,
    emailVerified,
  }
}
