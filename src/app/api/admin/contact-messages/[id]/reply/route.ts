import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminUser } from "@/lib/session"
import { handleApiError } from "@/lib/api-errors"
import { canUseSmtpTransport, getEmailConfigIssues, sendEmail } from "@/lib/mailer"
import { assertSameOrigin } from "@/lib/csrf"

const replySchema = z.object({
  subject: z.string().trim().min(3).max(140).optional(),
  message: z.string().trim().min(3).max(4000),
  markResolved: z.boolean().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req)
    await requireAdminUser()
    const { id } = await params
    const body = await req.json()
    const parsed = replySchema.parse(body)

    const contact = await prisma.contactMessage.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, subject: true, status: true },
    })

    if (!contact) {
      return NextResponse.json(
        { success: false, message: "Contact message not found." },
        { status: 404 }
      )
    }

    if (!canUseSmtpTransport()) {
      return NextResponse.json(
        {
          success: false,
          message: "SMTP is not configured for replies.",
          details:
            process.env.NODE_ENV === "development" ? getEmailConfigIssues() : undefined,
        },
        { status: 503 }
      )
    }

    const replySubject = parsed.subject || `Re: ${contact.subject}`
    try {
      await sendEmail({
        to: contact.email,
        subject: replySubject,
        text: parsed.message,
      })
    } catch (error) {
      console.error("Contact email failed:", error)
      return NextResponse.json(
        { success: false, message: "Failed to send email reply." },
        { status: 502 }
      )
    }

    const shouldResolve = parsed.markResolved ?? contact.status !== "RESOLVED"
    await prisma.contactMessage.update({
      where: { id: contact.id },
      data: shouldResolve
        ? { status: "RESOLVED", resolvedAt: new Date() }
        : {},
    })

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully.",
    })
  } catch (error) {
    return handleApiError(error)
  }
}
