"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Hexagon, Menu } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
    name: string
    email: string
    role: string
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

    const showUserDashboard = user?.role === "USER"
    const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard"
    const userInitials = getInitials(user?.name || "User")

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        setUser(null)
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
                    {showUserDashboard && (
                        <Link
                            href={dashboardHref}
                            className={`transition-colors hover:text-foreground/80 ${pathname.startsWith("/dashboard") ? "text-foreground" : "text-foreground/60"
                                }`}
                        >
                            Dashboard
                        </Link>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex items-center space-x-2">
                        <ModeToggle />
                      
                        <Button variant="outline" asChild>
                            <Link href="/login">Client Panel</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/request-service">Request Service</Link>
                        </Button>
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full p-0">
                                        <Avatar>
                                            <AvatarFallback>{userInitials}</AvatarFallback>
                                        </Avatar>
                                        <span className="sr-only">Open profile</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <DropdownMenuLabel>Profile</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <div className="px-2 py-1.5">
                                        <p className="text-xs text-muted-foreground">Name</p>
                                        <p className="text-sm font-medium">{user.name}</p>
                                    </div>
                                    <div className="px-2 py-1.5">
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="text-sm font-medium">{user.email}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} variant="destructive">
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button variant="outline" asChild>
                                <Link href="/login">Log In</Link>
                            </Button>
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
                                {showUserDashboard && (
                                    <Link
                                        href={dashboardHref}
                                        className={`text-lg font-medium transition-colors hover:text-foreground/80 ${pathname.startsWith("/dashboard") ? "text-foreground" : "text-foreground/60"
                                            }`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                )}
                            </div>
                            <div className="flex flex-col space-y-4 pr-6">
                                <Button variant="outline" asChild className="w-full justify-start">
                                    <Link href="/login" onClick={() => setIsOpen(false)}>
                                        Client Panel
                                    </Link>
                                </Button>
                                {showUserDashboard && (
                                    <Button variant="outline" asChild className="w-full justify-start">
                                        <Link href={dashboardHref} onClick={() => setIsOpen(false)}>
                                            Dashboard
                                        </Link>
                                    </Button>
                                )}
                                <Button asChild className="w-full justify-start">
                                    <Link href="/request-service" onClick={() => setIsOpen(false)}>
                                        Request Service
                                    </Link>
                                </Button>
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
