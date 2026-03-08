import { NextResponse } from "next/server"
import { ZodError } from "zod"

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: error.issues },
      { status: 400 }
    )
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      )
    }
    if (error.message === "CSRF_INVALID_ORIGIN") {
      return NextResponse.json(
        { success: false, message: "Invalid request origin." },
        { status: 403 }
      )
    }
  }

  console.error("API route error:", error)

  return NextResponse.json(
    { success: false, message: "Internal server error" },
    { status: 500 }
  )
}
