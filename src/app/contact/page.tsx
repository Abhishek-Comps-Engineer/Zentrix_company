"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Invalid email address." }),
    subject: z
        .string()
        .min(3, { message: "Subject must be at least 3 characters." })
        .max(140, { message: "Subject is too long." }),
    message: z.string().min(10, { message: "Message must be at least 10 characters." }),
    website: z.string().optional(),
})

export default function ContactPage() {
    const [loading, setLoading] = useState(false)
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            subject: "",
            message: "",
            website: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })
            await res.json().catch(() => null)

            if (!res.ok) {
                toast("Error", {
                    description: "Message could not be sent. Please try again later.",
                })
                return
            }

            toast("Message Sent", {
                description: "Your message has been sent successfully.",
            })
            form.reset()
        } catch {
            toast("Error", {
                description: "Message could not be sent. Please try again later.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Contact Us</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Get in touch with our team to discuss your next big project.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                <div className="space-y-8">
                    <div>
                        <h3 className="text-2xl font-bold mb-6">Contact Information</h3>

                        <div className="space-y-4 text-muted-foreground">

                            {/* Location */}
                            <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-primary" />
                                <span>Mumbai, India</span>
                            </div>

                            <div className="flex flex-wrap gap-3">

                                <Button asChild variant="outline">
                                    <a href="tel:7058746794">
                                        <Phone className="mr-2 h-4 w-4" />
                                        Call 7058746794
                                    </a>
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button asChild variant="outline">
                                    <a
                                        href="https://wa.me/917058746794"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Chat on WhatsApp
                                    </a>
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button asChild variant="outline">
                                    <a href="mailto:zentrixsoftwares@gmail.com">
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email on zentrixsoftwares@gmail.com
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-8 rounded-xl border shadow-sm">
                    <h3 className="text-2xl font-bold mb-6">Send a Message</h3>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="john@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Project inquiry" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Tell us about your project..."
                                                className="min-h-[120px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem className="hidden">
                                        <FormLabel>Website</FormLabel>
                                        <FormControl>
                                            <Input tabIndex={-1} autoComplete="off" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Sending..." : "Send Message"}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}
