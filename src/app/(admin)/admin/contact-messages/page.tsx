"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Bell, Mail, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  createdAt: string
  status: "OPEN" | "RESOLVED"
  emailStatus: "PENDING" | "SENT" | "FAILED"
  errorMessage: string | null
  notifiedAdmin: boolean
  resolvedAt: string | null
}

type AdminNotification = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

const PAGE_SIZE = 20

function getEmailStatusVariant(status: ContactMessage["emailStatus"]) {
  if (status === "SENT") return "default"
  if (status === "FAILED") return "destructive"
  return "secondary"
}

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [emailStatusFilter, setEmailStatusFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [replySubject, setReplySubject] = useState("")
  const [replyBody, setReplyBody] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  const selectedMessage = useMemo(
    () => messages.find((entry) => entry.id === selectedId) || null,
    [messages, selectedId]
  )
  const unreadCount = useMemo(
    () => notifications.filter((entry) => !entry.isRead).length,
    [notifications]
  )

  const loadMessages = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      q: query.trim(),
    })
    if (emailStatusFilter !== "ALL") params.set("emailStatus", emailStatusFilter)
    if (statusFilter !== "ALL") params.set("status", statusFilter)

    const res = await fetch(`/api/admin/contact-messages?${params.toString()}`, {
      cache: "no-store",
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || "Failed to load contact messages.")
    }
    setMessages(data.messages || [])
    setTotalPages(data?.pagination?.totalPages || 1)
    if (selectedId && !data.messages.some((entry: ContactMessage) => entry.id === selectedId)) {
      setSelectedId(null)
    }
  }, [emailStatusFilter, page, query, selectedId, statusFilter])

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/admin/notifications", { cache: "no-store" })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || "Failed to load admin notifications.")
    }
    setNotifications(
      (data.notifications || []).filter(
        (entry: AdminNotification) => entry.type === "CONTACT_MESSAGE"
      )
    )
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadMessages(), loadNotifications()])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load inbox data."
      toast("Error", { description: message })
    } finally {
      setLoading(false)
    }
  }, [loadMessages, loadNotifications])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    setPage(1)
  }, [query, emailStatusFilter, statusFilter])

  async function updateMessageStatus(id: string, action: "resolve" | "reopen") {
    const res = await fetch("/api/admin/contact-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    })
    const data = await res.json()
    if (!res.ok) {
      return toast("Error", { description: data.message || "Failed to update message status." })
    }
    toast("Updated", { description: data.message })
    await loadMessages()
  }

  async function markAllNotificationsRead() {
    const res = await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    })
    const data = await res.json()
    if (!res.ok) {
      return toast("Error", { description: data.message || "Failed to update notifications." })
    }
    await loadNotifications()
  }

  async function sendReply() {
    if (!selectedMessage) return
    if (!replyBody.trim()) {
      return toast("Error", { description: "Reply message cannot be empty." })
    }

    setSendingReply(true)
    try {
      const res = await fetch(
        `/api/admin/contact-messages/${selectedMessage.id}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: replySubject.trim() || undefined,
            message: replyBody.trim(),
            markResolved: true,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        return toast("Error", { description: data.message || "Failed to send reply." })
      }

      toast("Reply Sent", { description: "Email reply sent to the user." })
      setReplyBody("")
      setReplySubject("")
      await loadMessages()
    } catch {
      toast("Error", { description: "Network error while sending reply." })
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Messages</h1>
          <p className="text-muted-foreground">
            Track incoming contact requests, delivery state, and manual replies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Back to Admin</Link>
          </Button>
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Admin Notifications
            </CardTitle>
            <CardDescription>Contact request alerts from website submissions.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
              {unreadCount} unread
            </Badge>
            <Button variant="outline" onClick={markAllNotificationsRead}>
              Mark all read
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.slice(0, 6).map((notification) => (
            <div key={notification.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{notification.title}</p>
                {!notification.isRead && <Badge>Unread</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No contact notifications yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>Filter by delivery state and resolution status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Search name, email, subject, message"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Email status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All email states</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Message status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={selectedId === entry.id ? "bg-muted/50" : ""}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <TableCell>{entry.name}</TableCell>
                    <TableCell>{entry.email}</TableCell>
                    <TableCell>{entry.subject}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{entry.message}</TableCell>
                    <TableCell>
                      <Badge variant={getEmailStatusVariant(entry.emailStatus)}>
                        {entry.emailStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "OPEN" ? "secondary" : "default"}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {messages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No contact messages found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
            <CardDescription>Open a row in the inbox to manage it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedMessage && (
              <p className="text-sm text-muted-foreground">Select a message to view details.</p>
            )}

            {selectedMessage && (
              <>
                <div className="space-y-1">
                  <p className="text-sm"><span className="font-medium">Name:</span> {selectedMessage.name}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {selectedMessage.email}</p>
                  <p className="text-sm"><span className="font-medium">Subject:</span> {selectedMessage.subject}</p>
                  <p className="text-sm"><span className="font-medium">Received:</span> {new Date(selectedMessage.createdAt).toLocaleString()}</p>
                </div>

                <div className="rounded border p-3 text-sm whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>

                {selectedMessage.emailStatus === "FAILED" && selectedMessage.errorMessage && (
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <p className="font-medium">Email delivery failed</p>
                    <p>{selectedMessage.errorMessage}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedMessage.status === "RESOLVED" ? "outline" : "default"}
                    onClick={() =>
                      updateMessageStatus(
                        selectedMessage.id,
                        selectedMessage.status === "RESOLVED" ? "reopen" : "resolve"
                      )
                    }
                  >
                    {selectedMessage.status === "RESOLVED" ? "Reopen" : "Mark Resolved"}
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Reply by Email
                  </p>
                  <Input
                    placeholder={`Re: ${selectedMessage.subject}`}
                    value={replySubject}
                    onChange={(event) => setReplySubject(event.target.value)}
                  />
                  <Textarea
                    placeholder="Write your reply..."
                    className="min-h-[120px]"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                  />
                  <Button onClick={sendReply} disabled={sendingReply}>
                    {sendingReply ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
