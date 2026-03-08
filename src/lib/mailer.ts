import nodemailer from "nodemailer"

function normalizeEmailToken(value: string | undefined) {
  if (!value) return value
  const trimmed = value.trim()

  const mailtoMatch = trimmed.match(/\(mailto:([^)]+)\)/i)
  if (mailtoMatch?.[1]) {
    return mailtoMatch[1].trim()
  }

  const markdownEmailMatch = trimmed.match(/\[([^\]]+@[^\]]+)\]\([^)]+\)/i)
  if (markdownEmailMatch?.[1]) {
    return markdownEmailMatch[1].trim()
  }

  return trimmed
}

const SMTP_HOST = process.env.SMTP_HOST?.trim()
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = normalizeEmailToken(process.env.SMTP_USER)
const SMTP_PASS = process.env.SMTP_PASS?.trim()
const SMTP_FROM = process.env.SMTP_FROM?.trim()
const ADMIN_EMAIL = normalizeEmailToken(process.env.ADMIN_EMAIL)

let transporterVerified: Promise<boolean> | null = null
let transporter: nodemailer.Transporter | null = null

export function canSendEmail() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM && ADMIN_EMAIL)
}

export function canUseSmtpTransport() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM)
}

function getSmtpConfigIssues() {
  const issues: string[] = []
  if (!SMTP_HOST) issues.push("SMTP_HOST is missing")
  if (!SMTP_PORT || Number.isNaN(SMTP_PORT)) issues.push("SMTP_PORT is invalid")
  if (!SMTP_USER) issues.push("SMTP_USER is missing")
  if (!SMTP_PASS) issues.push("SMTP_PASS is missing")
  if (!SMTP_FROM) issues.push("SMTP_FROM is missing")
  return issues
}

export function getEmailConfigIssues() {
  const issues = getSmtpConfigIssues()
  if (!ADMIN_EMAIL) issues.push("ADMIN_EMAIL is missing")
  return issues
}

function getTransporter() {
  if (!canUseSmtpTransport()) {
    throw new Error(`Email service is not configured: ${getSmtpConfigIssues().join(", ")}`)
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  return transporter
}

async function verifyTransporter() {
  if (!transporterVerified) {
    const currentTransporter = getTransporter()
    transporterVerified = currentTransporter.verify()
  }

  try {
    await transporterVerified
  } catch (error) {
    transporterVerified = null
    transporter = null
    throw error
  }
}

export async function sendAdminEmail(
  subject: string,
  text: string,
  html?: string,
  replyTo?: string
) {
  if (!ADMIN_EMAIL) {
    throw new Error("ADMIN_EMAIL is missing")
  }
  await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    text,
    html,
    replyTo,
  })
}

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput) {
  await verifyTransporter()
  const transporter = getTransporter()
  await transporter.sendMail({
    from: SMTP_FROM!,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text,
    replyTo: input.replyTo,
  })
}
