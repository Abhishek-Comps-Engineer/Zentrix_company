import { cookies } from "next/headers"

const tokenMaxAge = 60 * 60 * 24

export async function setAuthCookie(token: string) {
  ;(await cookies()).set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: tokenMaxAge,
    path: "/",
  })
}

export async function clearAuthCookie() {
  ;(await cookies()).delete("token")
}
