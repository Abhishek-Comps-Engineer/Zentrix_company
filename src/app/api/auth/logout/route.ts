import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/auth-cookie"
import { assertSameOrigin } from "@/lib/csrf"
import { handleApiError } from "@/lib/api-errors"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        assertSameOrigin(req)
        await clearAuthCookie()
        return NextResponse.json({ success: true, message: "Logged out successfully" })
    } catch (error) {
        return handleApiError(error)
    }
}
