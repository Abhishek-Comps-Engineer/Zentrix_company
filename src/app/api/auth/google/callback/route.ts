import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import { getJwtSecret } from "@/lib/auth"
import {
  exchangeGoogleCodeForTokens,
  isGoogleAuthConfigError,
  sanitizeCallbackUrl,
  verifyGoogleIdToken,
} from "@/lib/google-auth"
import { createAdminNotification } from "@/lib/notifications"
import { logUserActivity } from "@/lib/activity"
import { setAuthCookie } from "@/lib/auth-cookie"

const oauthCookieName = "google_oauth_state"
const oauthStateMaxAgeMs = 10 * 60 * 1000

type GoogleOAuthState = {
  state: string
  nonce: string
  callbackUrl: string
  createdAt: number
}

export const runtime = "nodejs"

function decodeStateCookie(rawValue: string | undefined): GoogleOAuthState | null {
  if (!rawValue) return null
  try {
    const parsed = JSON.parse(
      Buffer.from(rawValue, "base64url").toString("utf8")
    ) as GoogleOAuthState
    if (!parsed.state || !parsed.nonce || !parsed.createdAt) return null
    return parsed
  } catch {
    return null
  }
}

function buildErrorRedirect(req: Request, code: string) {
  const url = new URL("/login", req.url)
  url.searchParams.set("error", code)
  return NextResponse.redirect(url)
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const stateCookie = decodeStateCookie(cookieStore.get(oauthCookieName)?.value)
  cookieStore.delete(oauthCookieName)

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const oauthError = url.searchParams.get("error")

    if (oauthError) {
      return buildErrorRedirect(req, "google_denied")
    }
    if (!code || !state || !stateCookie) {
      return buildErrorRedirect(req, "google_invalid_state")
    }
    if (Date.now() - stateCookie.createdAt > oauthStateMaxAgeMs) {
      return buildErrorRedirect(req, "google_state_expired")
    }
    if (state !== stateCookie.state) {
      return buildErrorRedirect(req, "google_invalid_state")
    }

    const tokenResponse = await exchangeGoogleCodeForTokens({ req, code })
    const profile = await verifyGoogleIdToken({
      req,
      idToken: tokenResponse.id_token!,
      expectedNonce: stateCookie.nonce,
    })

    if (!profile.emailVerified) {
      return buildErrorRedirect(req, "google_email_unverified")
    }

    let createdNewUser = false
    const user = await prisma.$transaction(async (tx) => {
      const byGoogleId = await tx.user.findFirst({
        where: { googleId: profile.googleId },
      })
      if (byGoogleId) {
        return byGoogleId
      }

      const byEmail = await tx.user.findUnique({
        where: { email: profile.email },
      })

      if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== profile.googleId) {
          throw new Error("GOOGLE_ACCOUNT_CONFLICT")
        }

        return tx.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.googleId,
            provider: byEmail.provider === "LOCAL" ? "LOCAL" : "GOOGLE",
            name: byEmail.name?.trim() ? byEmail.name : profile.name,
          },
        })
      }

      createdNewUser = true
      return tx.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: null,
          provider: "GOOGLE",
          googleId: profile.googleId,
        },
      })
    })

    if (!user.isActive) {
      return buildErrorRedirect(req, "account_inactive")
    }

    if (createdNewUser) {
      try {
        await createAdminNotification(
          "USER_REGISTERED",
          "New user registered",
          `${user.name} (${user.email}) signed up with Google.`,
          "USER",
          user.id
        )
      } catch (notificationError) {
        console.error("Google signup notification failed:", notificationError)
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      getJwtSecret(),
      { expiresIn: "1d" }
    )
    await setAuthCookie(token)

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    await logUserActivity(user.id, "LOGIN_GOOGLE", {
      createdNewUser,
      email: user.email,
    })

    const callbackUrl = sanitizeCallbackUrl(stateCookie.callbackUrl)
    const destination =
      user.role === "ADMIN"
        ? "/admin"
        : callbackUrl.startsWith("/admin")
          ? "/dashboard"
          : callbackUrl

    return NextResponse.redirect(new URL(destination, req.url))
  } catch (error) {
    if (isGoogleAuthConfigError(error)) {
      return buildErrorRedirect(req, "google_config")
    }
    if (error instanceof Error && error.message === "GOOGLE_ACCOUNT_CONFLICT") {
      return buildErrorRedirect(req, "google_account_conflict")
    }
    console.error("Google OAuth callback failed:", error)
    return buildErrorRedirect(req, "google_auth_failed")
  }
}
