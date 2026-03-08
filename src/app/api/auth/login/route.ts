import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { consumeRateLimit, getRequestIp, resetRateLimit } from "@/lib/rate-limit"
import { getJwtSecret, isAuthConfigError } from "@/lib/auth"
import { logUserActivity } from "@/lib/activity"
import { assertSameOrigin } from "@/lib/csrf"
import { setAuthCookie } from "@/lib/auth-cookie"

export const runtime = "nodejs"

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
})

const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request) {
    try {
        assertSameOrigin(req)

        const body = await req.json()
        const emailCandidate =
            typeof body?.email === "string"
                ? body.email.toLowerCase().trim()
                : "unknown"
        const rateLimitKey = `login:${getRequestIp(req)}:${emailCandidate}`

        const rateLimit = consumeRateLimit(
            rateLimitKey,
            LOGIN_MAX_ATTEMPTS,
            LOGIN_WINDOW_MS
        )

        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
                },
                {
                    status: 429,
                    headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
                }
            )
        }

        const { email, password } = loginSchema.parse(body)
        const normalizedEmail = email.toLowerCase().trim()

        const user = await prisma.user.findFirst({
            where: { email: normalizedEmail },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, message: "Invalid credentials." },
                { status: 401 }
            )
        }

        if (!user.password) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This account was created with Google. Use Continue with Google.",
                },
                { status: 400 }
            )
        }

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
            return NextResponse.json(
                { success: false, message: "Invalid credentials." },
                { status: 401 }
            )
        }

        if (!user.isActive) {
            return NextResponse.json(
                { success: false, message: "Your account is inactive. Contact support." },
                { status: 403 }
            )
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
        await logUserActivity(user.id, "LOGIN", { email: user.email })
        resetRateLimit(rateLimitKey)

        return NextResponse.json(
            {
                success: true,
                message: "Logged in successfully.",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    provider: user.provider,
                }
            },
            { status: 200 }
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, message: "Validation error", errors: error.issues },
                { status: 400 }
            )
        }
        if (isAuthConfigError(error)) {
            return NextResponse.json(
                { success: false, message: "Server authentication is misconfigured." },
                { status: 500 }
            )
        }
        if (error instanceof Error && error.message === "CSRF_INVALID_ORIGIN") {
            return NextResponse.json(
                { success: false, message: "Invalid request origin." },
                { status: 403 }
            )
        }
        console.error("Login API failed:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error." },
            { status: 500 }
        )
    }
}
