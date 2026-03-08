import { NextResponse } from "next/server"
import { ContactEmailStatus, Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { handleApiError } from "@/lib/api-errors"
import { createAdminNotification } from "@/lib/notifications"
import { sendAdminEmail, canSendEmail, getEmailConfigIssues } from "@/lib/mailer"
import { logUserActivity } from "@/lib/activity"
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit"
import { assertSameOrigin } from "@/lib/csrf"

export const runtime = "nodejs"

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional(),
})

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)

    const rateLimit = consumeRateLimit(
      `contact:${getRequestIp(req)}`,
      6,
      10 * 60 * 1000
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many contact submissions. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      )
    }

    const body = await req.json()
    const parsed = contactSchema.parse(body)
    if (parsed.website?.trim()) {
      // Honeypot trap: silently accept spam-like submissions.
      return NextResponse.json(
        { success: true, message: "Your message has been sent successfully" },
        { status: 201 }
      )
    }

    const normalized = {
      name: parsed.name.trim(),
      email: parsed.email.trim().toLowerCase(),
      subject: parsed.subject.trim(),
      message: parsed.message.trim(),
    }
    const sessionUser = await getSessionUser()

    const duplicate = await prisma.contactMessage.findFirst({
      where: {
        email: normalized.email,
        subject: normalized.subject,
        message: normalized.message,
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000),
        },
      },
      select: { id: true },
    })

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Duplicate message detected. Please wait a moment before sending again.",
        },
        { status: 429 }
      )
    }

    const contact = await prisma.contactMessage.create({
      data: {
        name: normalized.name,
        email: normalized.email,
        subject: normalized.subject,
        message: normalized.message,
        userId: sessionUser?.userId,
      },
    })

    let notifiedAdmin = false
    try {
      await createAdminNotification(
        "CONTACT_MESSAGE",
        "New Contact Request",
        `${normalized.name} submitted a contact form`,
        "CONTACT_MESSAGE",
        contact.id
      )
      notifiedAdmin = true
    } catch (notificationError) {
      console.error("Contact notification creation failed:", notificationError)
    }

    if (sessionUser) {
      await logUserActivity(sessionUser.userId, "CONTACT_MESSAGE_SENT", {
        contactMessageId: contact.id,
      })
    }

    const timestamp = new Date().toISOString()
    let emailStatus: ContactEmailStatus = "SENT"
    let emailErrorMessage: string | null = null

    if (!canSendEmail()) {
      emailStatus = "FAILED"
      emailErrorMessage = `SMTP not configured: ${getEmailConfigIssues().join(", ")}`
    } else {
      try {
        await sendAdminEmail(
          `New Contact Request - ${normalized.subject}`,
          `Name: ${normalized.name}\nEmail: ${normalized.email}\nTimestamp: ${timestamp}\n\nMessage:\n${normalized.message}`,
          undefined,
          normalized.email
        )
      } catch (error) {
        emailStatus = "FAILED"
        emailErrorMessage =
          error instanceof Error ? error.message : "Unknown SMTP error"
      }
    }

    if (emailStatus === "FAILED") {
      console.error("Contact email failed:", emailErrorMessage)
    }

    try {
      await prisma.contactMessage.update({
        where: { id: contact.id },
        data: {
          emailStatus,
          errorMessage: emailErrorMessage,
          notifiedAdmin,
        },
      })
    } catch (statusUpdateError) {
      console.error("Contact message status update failed:", statusUpdateError)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2022"
    ) {
      console.error("Contact submission failed due to schema drift:", error)
      return NextResponse.json(
        {
          success: false,
          message:
            "Message could not be sent. Please try again later.",
        },
        { status: 503 }
      )
    }
    console.error("Contact submission failed:", error)
    return handleApiError(error)
  }
}
