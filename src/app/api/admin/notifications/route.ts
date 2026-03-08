import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminUser } from "@/lib/session"
import { handleApiError } from "@/lib/api-errors"
import { assertSameOrigin } from "@/lib/csrf"

const patchSchema = z.object({
  action: z.enum(["mark-read", "mark-all-read", "clear-read"]),
  notificationId: z.string().optional(),
})

export async function GET() {
  try {
    await requireAdminUser()
    const notifications = await prisma.notification.findMany({
      where: { forAdmin: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return NextResponse.json({ success: true, notifications })
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

    if (parsed.action === "mark-read" && parsed.notificationId) {
      await prisma.notification.updateMany({
        where: { id: parsed.notificationId, forAdmin: true },
        data: { isRead: true },
      })
    } else if (parsed.action === "mark-all-read") {
      await prisma.notification.updateMany({
        where: { forAdmin: true, isRead: false },
        data: { isRead: true },
      })
    } else if (parsed.action === "clear-read") {
      await prisma.notification.deleteMany({
        where: { forAdmin: true, isRead: true },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Notification action completed.",
    })
  } catch (error) {
    return handleApiError(error)
  }
}
