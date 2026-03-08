import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminUser } from "@/lib/session"
import { handleApiError } from "@/lib/api-errors"
import { assertSameOrigin } from "@/lib/csrf"

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["resolve", "reopen"]),
})

export async function GET(req: Request) {
  try {
    await requireAdminUser()
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim()
    const emailStatus = searchParams.get("emailStatus")
    const status = searchParams.get("status")
    const pageRaw = Number(searchParams.get("page") || "1")
    const limitRaw = Number(searchParams.get("limit") || "20")
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 20
    const skip = (page - 1) * limit

    const where = {
      AND: [
        emailStatus && ["PENDING", "SENT", "FAILED"].includes(emailStatus)
          ? { emailStatus: emailStatus as "PENDING" | "SENT" | "FAILED" }
          : {},
        status && ["OPEN", "RESOLVED"].includes(status)
          ? { status: status as "OPEN" | "RESOLVED" }
          : {},
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { subject: { contains: q, mode: "insensitive" as const } },
                { message: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {},
      ],
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req)
    await requireAdminUser()
    const body = await req.json()
    const parsed = patchSchema.parse(body)

    const status = parsed.action === "resolve" ? "RESOLVED" : "OPEN"

    const message = await prisma.contactMessage.update({
      where: { id: parsed.id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      message: status === "RESOLVED" ? "Message marked as resolved." : "Message reopened.",
      contactMessage: message,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
