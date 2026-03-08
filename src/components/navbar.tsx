"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Hexagon, Menu } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const links = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/contact", label: "Contact" },
]

type AuthUser = {
    id: string
    name: string
    email: string
    role: "USER" | "ADMIN"
    image?: string | null
    avatarUrl?: string | null
    provider: "LOCAL" | "GOOGLE"
    createdAt: string
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "U"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
    const [failed, setFailed] = React.useState(false)
    const logoSizeClass = compact ? "h-8 w-8" : "h-9 w-9"
    const textClass = compact
        ? "text-xl font-bold tracking-tight"
        : "text-2xl font-bold tracking-tight"

    if (failed) {
        return (
            <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-sm">
                    <Hexagon className="h-4 w-4" />
                </span>
                <span className={`${textClass} bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent`}>
                    Zentrix
                </span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Image
                src="/logo.png"
                alt="Zentrix logo"
                width={40}
                height={40}
                className={`${logoSizeClass} rounded-sm object-contain`}
                priority
                onError={() => setFailed(true)}
            />
            <span className={`${textClass} bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent`}>
                Zentrix
            </span>
        </div>
    )
}

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = React.useState(false)
    const [profileMenuOpen, setProfileMenuOpen] = React.useState(false)
    const [user, setUser] = React.useState<AuthUser | null>(null)

    React.useEffect(() => {
        let mounted = true

        async function loadUser() {
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" })
                if (!res.ok) return

                const data = await res.json()
                if (mounted && data?.user) {
                    setUser(data.user as AuthUser)
                }
            } catch {
                // Unauthenticated is expected on public pages.
            }
        }

        loadUser()
        return () => {
            mounted = false
        }
    }, [])

    const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard"
    const isLoggedIn = Boolean(user)
    const initials = getInitials(user?.name || "User")

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        setUser(null)
        setProfileMenuOpen(false)
        setIsOpen(false)
        router.push("/")
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
                <Link href="/" className="flex items-center">
                    <BrandLogo />
                </Link>
                <div className="hidden md:flex flex-1 items-center justify-center space-x-6 text-sm font-medium">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`transition-colors hover:text-foreground/80 ${pathname === link.href ? "text-foreground" : "text-foreground/60"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {isLoggedIn && (
                        <Link
                            href={dashboardHref}
                            className={`transition-colors hover:text-foreground/80 ${pathname.startsWith("/dashboard") || pathname.startsWith("/admin") ? "text-foreground" : "text-foreground/60"
                                }`}
                        >
                            Dashboard
                        </Link>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex items-center space-x-2">
                        <ModeToggle />

                        {!isLoggedIn && (
                            <Button variant="outline" asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                        )}

                        {isLoggedIn && (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={dashboardHref}>Dashboard</Link>
                                </Button>
                                <DropdownMenu
                                    open={profileMenuOpen}
                                    onOpenChange={setProfileMenuOpen}
                                >
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label="Open profile"
                                            className="rounded-full"
                                        >
                                            <Avatar className="size-9 border bg-muted">
                                                <AvatarImage
                                                    src={user?.avatarUrl || user?.image || undefined}
                                                    alt={user?.name || "Profile"}
                                                />
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-3">
                                        <div className="space-y-1 text-sm">
                                            <p className="font-medium">{user?.name}</p>
                                            <p className="text-muted-foreground">{user?.email}</p>
                                        </div>
                                        <div className="mt-3 flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                Close
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={handleLogout}>
                                                Logout
                                            </Button>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
                            >
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="pr-0">
                            <Link
                                href="/"
                                className="flex items-center"
                                onClick={() => setIsOpen(false)}
                            >
                                <BrandLogo compact />
                            </Link>
                            <div className="my-8 flex flex-col space-y-4">
                                {links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`text-lg font-medium transition-colors hover:text-foreground/80 ${pathname === link.href ? "text-foreground" : "text-foreground/60"
                                            }`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                {isLoggedIn && (
                                    <Link
                                        href={dashboardHref}
                                        className={`text-lg font-medium transition-colors hover:text-foreground/80 ${pathname.startsWith("/dashboard") || pathname.startsWith("/admin") ? "text-foreground" : "text-foreground/60"
                                            }`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                )}
                            </div>
                            <div className="flex flex-col space-y-4 pr-6">
                                {!isLoggedIn && (
                                    <Button variant="outline" asChild className="w-full justify-start">
                                        <Link href="/login" onClick={() => setIsOpen(false)}>
                                            Login
                                        </Link>
                                    </Button>
                                )}
                                {isLoggedIn && (
                                    <>
                                        <Button variant="outline" asChild className="w-full justify-start">
                                            <Link href={dashboardHref} onClick={() => setIsOpen(false)}>
                                                Dashboard
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                setIsOpen(false)
                                                setProfileMenuOpen(true)
                                            }}
                                        >
                                            Profile
                                        </Button>
                                    </>
                                )}
                                <div className="pt-2">
                                    <ModeToggle />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}
