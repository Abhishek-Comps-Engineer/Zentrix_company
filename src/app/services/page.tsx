"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Code, Smartphone, BrainCircuit, Rocket, Server, Palette } from "lucide-react"
import { motion } from "framer-motion"

const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
})

const services = [
    {
        id: "web",
        title: "Web Development",
        icon: Code,
        desc: "We build fast, scalable, and secure web applications using modern frameworks like Next.js and React.",
        benefits: ["SEO Optimized", "Responsive Design", "High Performance"],
        pricing: "Custom quote based on scope",
    },
    {
        id: "mobile",
        title: "Mobile Apps",
        icon: Smartphone,
        desc: "Cross-platform and native mobile applications for iOS and Android.",
        benefits: ["Native Performance", "Offline Capabilities", "Push Notifications"],
        pricing: `Starting at ${inr.format(10000)}`,
    },
    {
        id: "ai",
        title: "AI/ML Solutions",
        icon: BrainCircuit,
        desc: "Integrate LLMs, computer vision, and predictive analytics into your products.",
        benefits: ["Automated Workflows", "Data Insights", "Personalization"],
        pricing: "Custom retainer or project based",
    },
    {
        id: "saas",
        title: "SaaS Platforms",
        icon: Rocket,
        desc: "End-to-end development of multi-tenant Software as a Service products.",
        benefits: ["Scalable Architecture", "Subscription Billing Integration", "Admin Dashboards"],
        pricing: "Custom quote",
    },
    {
        id: "api",
        title: "API Development",
        icon: Server,
        desc: "Robust REST and GraphQL APIs to power your ecosystem.",
        benefits: ["Secure", "Well-Documented", "High Availability"],
        pricing: `Starting at ${inr.format(5000)}`,
    },
    {
        id: "uiux",
        title: "UI/UX Design",
        icon: Palette,
        desc: "User-centered design focused on conversion and intuitive experiences.",
        benefits: ["Wireframing", "Prototyping", "Design Systems"],
        pricing: `Starting at ${inr.format(2000)}`,
    }
]

export default function ServicesPage() {
    return (
        <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Our Services</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Comprehensive software solutions tailored to your enterprise needs. From concept to deployment.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service, idx) => (
                    <motion.div
                        key={service.id}
                        id={service.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="h-full flex flex-col bg-secondary/10 hover:border-primary transition-colors">
                            <CardHeader>
                                <service.icon className="h-10 w-10 text-primary mb-4" />
                                <CardTitle className="text-2xl">{service.title}</CardTitle>
                                <CardDescription className="text-base">{service.desc}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm uppercase tracking-wider mb-2">Key Benefits</h4>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                                        {service.benefits.map((b, i) => <li key={i}>{b}</li>)}
                                    </ul>
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium mb-4">Pricing: <span className="text-muted-foreground">{service.pricing}</span></p>
                                    <Button className="w-full" asChild>
                                        <Link href={`/request-service?service=${service.id}`}>Request {service.title}</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
