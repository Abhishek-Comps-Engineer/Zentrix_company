"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
})

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const errorCode = searchParams.get("error")
    const callbackUrl = useMemo(() => {
        const callback = searchParams.get("callbackUrl")
        return callback && callback.startsWith("/") ? callback : "/dashboard"
    }, [searchParams])

    useEffect(() => {
        if (!errorCode) return

        const errorMessageMap: Record<string, string> = {
            google_config: "Google sign-in is not configured yet.",
            google_denied: "Google sign-in was cancelled.",
            google_invalid_state: "Google sign-in session is invalid. Please try again.",
            google_state_expired: "Google sign-in session expired. Please try again.",
            google_email_unverified: "Google account email is not verified.",
            google_account_conflict: "This Google account is linked to another user.",
            google_auth_failed: "Google authentication failed. Please try again.",
            account_inactive: "Your account is inactive. Contact support.",
        }

        toast("Sign-in Error", {
            description:
                errorMessageMap[errorCode] ||
                "Unable to complete sign-in. Please try again.",
        })
    }, [errorCode])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })
            const data = await res.json()

            if (res.ok) {
                toast("Success", { description: "Logged in successfully." })
                const destination =
                    data.user.role === "ADMIN"
                        ? "/admin"
                        : callbackUrl
                window.location.assign(destination)
            } else {
                toast("Error", { description: data.message || "Failed to login" })
            }
        } catch {
            toast("Error", { description: "Something went wrong" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                    <CardDescription>
                        Enter your email and password to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    className="pr-10"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
                                                    onClick={() => setShowPassword((value) => !value)}
                                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Signing in..." : "Sign In"}
                            </Button>
                            <div className="relative py-1">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">or</span>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full" asChild>
                                <a
                                    href={`/api/auth/google/start?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                                >
                                    Continue with Google
                                </a>
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-sm text-center text-muted-foreground">
                    <div>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-primary hover:underline">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
