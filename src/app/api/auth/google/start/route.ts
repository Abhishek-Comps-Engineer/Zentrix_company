import { randomBytes } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { buildGoogleAuthUrl, isGoogleAuthConfigError, sanitizeCallbackUrl } from "@/lib/google-auth"
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit"

const oauthCookieName = "google_oauth_state"
const oauthStateTtlSeconds = 10 * 60

export const runtime = "nodejs"

type GoogleOAuthState = {
  state: string
  nonce: string
  callbackUrl: string
  createdAt: number
}

function encodeStateCookie(payload: GoogleOAuthState) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export async function GET(req: Request) {
  try {
    const rateLimit = consumeRateLimit(
      `google-start:${getRequestIp(req)}`,
      20,
      10 * 60 * 1000
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      )
    }

    const { searchParams } = new URL(req.url)
    const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"))
    const state = randomBytes(24).toString("hex")
    const nonce = randomBytes(24).toString("hex")

    const payload: GoogleOAuthState = {
      state,
      nonce,
      callbackUrl,
      createdAt: Date.now(),
    }

    ;(await cookies()).set(oauthCookieName, encodeStateCookie(payload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: oauthStateTtlSeconds,
    })

    const authUrl = buildGoogleAuthUrl({
      req,
      state,
      nonce,
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    if (isGoogleAuthConfigError(error)) {
      const redirectUrl = new URL("/login?error=google_config", req.url)
      return NextResponse.redirect(redirectUrl)
    }
    console.error("Google OAuth start failed:", error)
    return NextResponse.json(
      { success: false, message: "Failed to initialize Google sign-in." },
      { status: 500 }
    )
  }
}
