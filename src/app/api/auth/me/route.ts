import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { isAuthConfigError } from "@/lib/auth"

export async function GET() {
    try {
        const session = await getSessionUser()
        if (!session) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                provider: true,
                createdAt: true,
            }
        })

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true, user }, { status: 200 })
    } catch (error) {
        if (isAuthConfigError(error)) {
            return NextResponse.json(
                { success: false, message: "Server authentication is misconfigured." },
                { status: 500 }
            )
        }
        return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 })
    }
}
