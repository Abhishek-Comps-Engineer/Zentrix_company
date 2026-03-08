import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { createAdminNotification } from "@/lib/notifications"
import { logUserActivity } from "@/lib/activity"
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit"
import { assertSameOrigin } from "@/lib/csrf"

export const runtime = "nodejs"

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
})

const REGISTER_LIMIT = 5
const REGISTER_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request) {
    try {
        assertSameOrigin(req)

        const rateLimit = consumeRateLimit(
            `register:${getRequestIp(req)}`,
            REGISTER_LIMIT,
            REGISTER_WINDOW_MS
        )

        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Too many registration attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
                },
                {
                    status: 429,
                    headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
                }
            )
        }

        const body = await req.json()
        const { name, email, password } = registerSchema.parse(body)
        const normalizedEmail = email.toLowerCase().trim()

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        })

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: existingUser.password
                        ? "User with this email already exists."
                        : "An account exists with this email via Google sign-in.",
                },
                { status: 409 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword,
                provider: "LOCAL",
            },
            select: { id: true, name: true, email: true, role: true },
        })

        await createAdminNotification(
            "USER_REGISTERED",
            "New user registered",
            `${user.name} (${user.email}) created an account.`,
            "USER",
            user.id
        )
        await logUserActivity(user.id, "REGISTER", { email: user.email })

        return NextResponse.json(
            { success: true, message: "User registered successfully.", user },
            { status: 201 }
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, message: "Validation error", errors: error.issues },
                { status: 400 }
            )
        }
        if (error instanceof Error && error.message === "CSRF_INVALID_ORIGIN") {
            return NextResponse.json(
                { success: false, message: "Invalid request origin." },
                { status: 403 }
            )
        }
        console.error("Register API failed:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error." },
            { status: 500 }
        )
    }
}
