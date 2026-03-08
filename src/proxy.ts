import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { getJwtSecretBytes } from "@/lib/auth"

// Proxy to protect certain routes (Next.js 16+ middleware replacement)
export async function proxy(request: NextRequest) {
    const token = request.cookies.get("token")?.value
    const { pathname } = request.nextUrl
    const isApiRoute = pathname.startsWith("/api/")
    const isAuthPage = pathname === "/login" || pathname === "/register"
    const isPublicAsset =
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/uploads/") ||
        pathname.startsWith("/images/") ||
        /\.[a-zA-Z0-9]+$/.test(pathname)

    const publicRoutes = ["/login", "/register", "/", "/about", "/services", "/portfolio", "/contact", "/privacy", "/terms"]
    const isPublicApi =
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/contact") ||
        pathname.startsWith("/api/projects")
    const isPublicContentRoute =
        pathname === "/" ||
        publicRoutes
            .filter((route) => route !== "/")
            .some((route) => pathname === route || pathname.startsWith(`${route}/`))
    const isPublicRoute = isPublicContentRoute || isPublicApi

    // Optionally permit next static files
    if (isPublicAsset) {
        return NextResponse.next()
    }

    // If trying to access protected route without token
    if (!token && !isPublicRoute) {
        if (isApiRoute) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }
        return NextResponse.redirect(new URL("/login", request.url))
    }

    let secret: Uint8Array
    try {
        secret = getJwtSecretBytes()
    } catch {
        return new NextResponse("Server authentication is misconfigured.", { status: 500 })
    }

    // Verify JWT if token exists (using jose as it works in edge runtime)
    if (token) {
        try {
            const { payload } = await jwtVerify(token, secret)

            // Role-based access for admin routes
            if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/dashboard", request.url))
            }

            // Redirect logged-in users away from auth pages
            if (isAuthPage && !isApiRoute) {
                return NextResponse.redirect(new URL(payload.role === "ADMIN" ? "/admin" : "/dashboard", request.url))
            }
        } catch {
            // Invalid token
            if (isPublicRoute) {
                const response = NextResponse.next()
                response.cookies.delete("token")
                return response
            }
            if (isApiRoute) {
                return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 })
            }
            const response = NextResponse.redirect(new URL("/login", request.url))
            response.cookies.delete("token")
            return response
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/public (if any)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
