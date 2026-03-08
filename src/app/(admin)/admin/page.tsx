"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { requestCategoryLabel, requestPriorityLabel, requestStatusLabel, serviceRequestCategories, serviceRequestPriorities, serviceRequestStatuses } from "@/lib/service-requests"
import { MediaImage } from "@/components/media/media-image"

type UserRow = {
  id: string
  name: string
  email: string
  role: "USER" | "ADMIN"
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  activities: { action: string; createdAt: string }[]
  _count: { serviceRequests: number; supportTickets: number }
}

type UserDetails = {
  id: string
  name: string
  email: string
  role: "USER" | "ADMIN"
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  _count: {
    serviceRequests: number
    supportTickets: number
    contactMessages: number
  }
  activities: {
    id: string
    action: string
    createdAt: string
  }[]
}

type ProjectRow = {
  id: string
  title: string
  technologies: string[]
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  category: "WEB" | "MOBILE" | "AI" | "SAAS"
  shortDescription: string
  detailedDescription: string
  coverImageUrl: string | null
  demoVideoUrl: string | null
  clientName: string | null
  completionDate: string | null
  liveLink: string | null
  repositoryLink: string | null
  media: UploadResult[]
}

type NotificationRow = {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

type SupportRow = {
  id: string
  subject: string
  message: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  user: { name: string; email: string }
  replies: {
    id: string
    message: string
    sender: { name: string; role: "USER" | "ADMIN" }
    createdAt: string
  }[]
}

type UploadResult = {
  type: "IMAGE" | "VIDEO" | "DOCUMENT"
  url: string
  fileName: string
  fileSize?: number
}

type ServiceRequestRow = {
  id: string
  title: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
  _count: { messages: number; attachments: number; timelineEvents: number }
}

type ServiceRequestDetails = {
  id: string
  title: string
  details: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
  attachments: {
    id: string
    type: "IMAGE" | "VIDEO" | "DOCUMENT"
    url: string
    fileName: string
  }[]
  messages: {
    id: string
    message: string
    createdAt: string
    sender: { id: string; name: string; role: "USER" | "ADMIN" }
    attachments: {
      id: string
      type: "IMAGE" | "VIDEO" | "DOCUMENT"
      url: string
      fileName: string
    }[]
  }[]
  timelineEvents: {
    id: string
    message: string
    createdAt: string
    actor: { id: string; name: string; role: "USER" | "ADMIN" } | null
  }[]
}

const initialProjectForm = {
  title: "",
  category: "WEB" as "WEB" | "MOBILE" | "AI" | "SAAS",
  shortDescription: "",
  detailedDescription: "",
  technologies: "",
  coverImageUrl: "",
  demoVideoUrl: "",
  clientName: "",
  completionDate: "",
  liveLink: "",
  repositoryLink: "",
  status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [support, setSupport] = useState<SupportRow[]>([])
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestRow[]>([])
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<ServiceRequestDetails | null>(null)
  const [serviceQuery, setServiceQuery] = useState("")
  const [serviceStatusFilter, setServiceStatusFilter] = useState("ALL")
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("ALL")
  const [servicePriorityFilter, setServicePriorityFilter] = useState("ALL")
  const [servicePage, setServicePage] = useState(1)
  const [serviceTotalPages, setServiceTotalPages] = useState(1)
  const [serviceReply, setServiceReply] = useState("")
  const [serviceReplyFiles, setServiceReplyFiles] = useState<UploadResult[]>([])
  const [serviceUploading, setServiceUploading] = useState(false)
  const [serviceUploadProgress, setServiceUploadProgress] = useState(0)
  const [serviceStatusUpdate, setServiceStatusUpdate] = useState<string>("UNDER_REVIEW")
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "ADMIN">("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [projectForm, setProjectForm] = useState(initialProjectForm)
  const [media, setMedia] = useState<UploadResult[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [replyMap, setReplyMap] = useState<Record<string, string>>({})
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" })
    if (!meRes.ok) return router.push("/login")
    const me = await meRes.json()
    if (me.user.role !== "ADMIN") return router.push("/dashboard")
    const usersParams = new URLSearchParams({
      limit: "20",
      page: String(currentPage),
      q: query,
    })
    if (roleFilter !== "ALL") {
      usersParams.set("role", roleFilter)
    }
    if (statusFilter !== "ALL") {
      usersParams.set("status", statusFilter)
    }
    const serviceParams = new URLSearchParams({
      limit: "20",
      page: String(servicePage),
      q: serviceQuery,
    })
    if (serviceStatusFilter !== "ALL") {
      serviceParams.set("status", serviceStatusFilter)
    }
    if (serviceCategoryFilter !== "ALL") {
      serviceParams.set("category", serviceCategoryFilter)
    }
    if (servicePriorityFilter !== "ALL") {
      serviceParams.set("priority", servicePriorityFilter)
    }

    const [usersRes, projectsRes, notificationsRes, supportRes, serviceRequestsRes] = await Promise.all([
      fetch(`/api/admin/users?${usersParams.toString()}`),
      fetch("/api/admin/projects"),
      fetch("/api/admin/notifications"),
      fetch("/api/admin/support"),
      fetch(`/api/admin/service-requests?${serviceParams.toString()}`),
    ])
    const [usersData, projectsData, notificationsData, supportData, serviceRequestsData] = await Promise.all([
      usersRes.json(),
      projectsRes.json(),
      notificationsRes.json(),
      supportRes.json(),
      serviceRequestsRes.json(),
    ])

    if (!usersRes.ok || !projectsRes.ok || !notificationsRes.ok || !supportRes.ok || !serviceRequestsRes.ok) {
      throw new Error("Failed to load admin resources")
    }

    setUsers(usersData.users || [])
    setTotalPages(usersData?.pagination?.totalPages || 1)
    setTotalUsers(usersData?.pagination?.total || 0)
    setProjects(projectsData.projects || [])
    setNotifications(notificationsData.notifications || [])
    setSupport(supportData.tickets || [])
    setServiceRequests(serviceRequestsData.requests || [])
    setServiceTotalPages(serviceRequestsData?.pagination?.totalPages || 1)
  }, [currentPage, query, roleFilter, router, serviceCategoryFilter, servicePage, servicePriorityFilter, serviceQuery, serviceStatusFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(queryInput.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [queryInput])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, roleFilter, statusFilter])

  useEffect(() => {
    setServicePage(1)
  }, [serviceCategoryFilter, servicePriorityFilter, serviceQuery, serviceStatusFilter])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        await loadData()
      } catch {
        if (!cancelled) {
          toast("Error", { description: "Failed to load admin data." })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function toggleUser(user: UserRow) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    if (!res.ok) return toast("Error", { description: "Failed to update user." })
    await loadData()
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete ${user.email}?`)) return
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
    if (!res.ok) return toast("Error", { description: "Failed to delete user." })
    if (selectedUser?.id === user.id) {
      setSelectedUser(null)
    }
    await loadData()
  }

  async function viewUser(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}`)
    const data = await res.json()

    if (!res.ok) {
      return toast("Error", { description: data.message || "Failed to load user details." })
    }

    setSelectedUser(data.user || null)
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    const form = new FormData()
    Array.from(files).forEach((file) => form.append("files", file))

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/admin/uploads")
      xhr.withCredentials = true

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}")
          if (xhr.status >= 200 && xhr.status < 300) {
            const normalized = (data.files || [])
              .map((file: UploadResult & { mediaType?: UploadResult["type"] }) => ({
                type: file.type || file.mediaType,
                url: file.url,
                fileName: file.fileName,
                fileSize: file.fileSize,
              }))
              .filter((file: UploadResult) => file.type && file.url)
            setMedia((prev) => [...prev, ...normalized])
          } else {
            toast("Error", { description: data.message || "Upload failed." })
          }
        } catch {
          toast("Error", { description: "Upload failed." })
        } finally {
          setUploading(false)
          setUploadProgress(0)
          resolve()
        }
      }

      xhr.onerror = () => {
        toast("Error", { description: "Network error during upload." })
        setUploading(false)
        setUploadProgress(0)
        resolve()
      }

      xhr.send(form)
    })
  }

  function normalizeOptionalField(value: string) {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  async function createProject() {
    const technologies = projectForm.technologies
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)

    if (!projectForm.title.trim() || technologies.length === 0) {
      return toast("Validation", { description: "Title and at least one technology are required." })
    }

    const payload = {
      ...projectForm,
      technologies,
      detailedDescription: projectForm.detailedDescription,
      coverImageUrl: normalizeOptionalField(projectForm.coverImageUrl),
      demoVideoUrl: normalizeOptionalField(projectForm.demoVideoUrl),
      clientName: normalizeOptionalField(projectForm.clientName),
      completionDate: projectForm.completionDate
        ? new Date(projectForm.completionDate).toISOString()
        : null,
      liveLink: normalizeOptionalField(projectForm.liveLink),
      repositoryLink: normalizeOptionalField(projectForm.repositoryLink),
      media,
    }
    const res = await fetch(editingProjectId ? `/api/admin/projects/${editingProjectId}` : "/api/admin/projects", {
      method: editingProjectId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return toast("Error", { description: data.message || "Project save failed." })
    toast("Success", { description: editingProjectId ? "Project updated." : "Project created." })
    setProjectForm(initialProjectForm)
    setMedia([])
    setEditingProjectId(null)
    await loadData()
  }

  async function markAllRead() {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    })
    await loadData()
  }

  async function deleteProject(project: ProjectRow) {
    if (!confirm(`Delete project ${project.title}?`)) return
    const res = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" })
    if (!res.ok) return toast("Error", { description: "Failed to delete project." })
    await loadData()
  }

  async function updateProjectStatus(project: ProjectRow, status: ProjectRow["status"]) {
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return toast("Error", { description: "Failed to update project status." })
    await loadData()
  }

  function editProject(project: ProjectRow) {
    setEditingProjectId(project.id)
    setProjectForm({
      title: project.title,
      category: project.category,
      shortDescription: project.shortDescription,
      detailedDescription: project.detailedDescription,
      technologies: project.technologies.join(", "),
      coverImageUrl: project.coverImageUrl || "",
      demoVideoUrl: project.demoVideoUrl || "",
      clientName: project.clientName || "",
      completionDate: project.completionDate
        ? new Date(project.completionDate).toISOString().slice(0, 10)
        : "",
      liveLink: project.liveLink || "",
      repositoryLink: project.repositoryLink || "",
      status: project.status,
    })
    setMedia(project.media || [])
  }

  async function updateSupportStatus(ticket: SupportRow, status: SupportRow["status"]) {
    const res = await fetch(`/api/admin/support/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return toast("Error", { description: "Failed to update support status." })
    await loadData()
  }

  async function sendSupportReply(ticket: SupportRow) {
    const message = (replyMap[ticket.id] || "").trim()
    if (!message) return

    const res = await fetch(`/api/support/${ticket.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) return toast("Error", { description: "Failed to send reply." })
    setReplyMap((prev) => ({ ...prev, [ticket.id]: "" }))
    await loadData()
  }

  async function loadServiceRequestDetails(requestId: string) {
    const res = await fetch(`/api/admin/service-requests/${requestId}`)
    const data = await res.json()
    if (!res.ok) {
      return toast("Error", { description: data.message || "Failed to load request details." })
    }
    setSelectedServiceRequest(data.request || null)
    setServiceStatusUpdate(data.request?.status || "UNDER_REVIEW")
  }

  async function updateServiceRequestStatus() {
    if (!selectedServiceRequest) return
    const res = await fetch(`/api/admin/service-requests/${selectedServiceRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: serviceStatusUpdate }),
    })
    const data = await res.json()
    if (!res.ok) {
      return toast("Error", { description: data.message || "Failed to update request status." })
    }
    toast("Success", { description: "Request status updated." })
    await Promise.all([loadData(), loadServiceRequestDetails(selectedServiceRequest.id)])
  }

  async function uploadServiceReplyFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setServiceUploading(true)
    setServiceUploadProgress(0)

    const form = new FormData()
    Array.from(files).forEach((file) => form.append("files", file))

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/services/uploads")
      xhr.withCredentials = true

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setServiceUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}")
          if (xhr.status >= 200 && xhr.status < 300) {
            const normalized = (data.files || [])
              .map((file: UploadResult & { mediaType?: UploadResult["type"] }) => ({
                type: file.type || file.mediaType,
                url: file.url,
                fileName: file.fileName,
                fileSize: file.fileSize,
              }))
              .filter((file: UploadResult) => file.type && file.url)
            setServiceReplyFiles((prev) => [...prev, ...normalized])
          } else {
            toast("Error", { description: data.message || "Upload failed." })
          }
        } catch {
          toast("Error", { description: "Upload failed." })
        } finally {
          setServiceUploading(false)
          setServiceUploadProgress(0)
          resolve()
        }
      }

      xhr.onerror = () => {
        toast("Error", { description: "Network error during upload." })
        setServiceUploading(false)
        setServiceUploadProgress(0)
        resolve()
      }

      xhr.send(form)
    })
  }

  async function sendServiceRequestReply() {
    if (!selectedServiceRequest || !serviceReply.trim()) return
    const res = await fetch(`/api/services/${selectedServiceRequest.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: serviceReply.trim(),
        attachments: serviceReplyFiles,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return toast("Error", { description: data.message || "Failed to send reply." })
    }

    toast("Success", { description: "Reply sent." })
    setServiceReply("")
    setServiceReplyFiles([])
    await Promise.all([loadData(), loadServiceRequestDetails(selectedServiceRequest.id)])
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading admin panel...</div>

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Admin Control Panel</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/contact-messages">Contact Inbox</Link>
        </Button>
      </div>
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
          <TabsTrigger value="service-requests">Service Requests</TabsTrigger>
          <TabsTrigger value="projects">Project Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, filter, inspect activity, activate/deactivate, and delete users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder="Search users..." value={queryInput} onChange={(e) => setQueryInput(e.target.value)} />
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All roles</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">Total users: {totalUsers}</p>

              {users.map((user) => (
                <div key={user.id} className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={user.isActive ? "default" : "destructive"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requests: {user._count.serviceRequests} | Support: {user._count.supportTickets}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleUser(user)}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => viewUser(user.id)}>
                      View Details
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteUser(user)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found for current filters.</p>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                <Button
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Next
                </Button>
              </div>

              {selectedUser && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>{selectedUser.name} ({selectedUser.email})</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Role: <span className="font-medium">{selectedUser.role}</span></p>
                    <p>Status: <span className="font-medium">{selectedUser.isActive ? "Active" : "Inactive"}</span></p>
                    <p>Registered: <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleString()}</span></p>
                    <p>Last Login: <span className="font-medium">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : "Never"}</span></p>
                    <p>Requests: <span className="font-medium">{selectedUser._count.serviceRequests}</span></p>
                    <p>Support Tickets: <span className="font-medium">{selectedUser._count.supportTickets}</span></p>
                    <p>Contact Messages: <span className="font-medium">{selectedUser._count.contactMessages}</span></p>
                    <div className="space-y-1 pt-2">
                      <p className="font-medium">Recent Activity</p>
                      {selectedUser.activities.length === 0 ? (
                        <p className="text-muted-foreground">No recent activity.</p>
                      ) : (
                        selectedUser.activities.map((activity) => (
                          <div key={activity.id} className="rounded border p-2">
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service-requests">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Request Management</CardTitle>
                <CardDescription>Filter and manage incoming client requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    placeholder="Search request title/user..."
                    value={serviceQuery}
                    onChange={(event) => setServiceQuery(event.target.value)}
                  />
                  <Select value={serviceStatusFilter} onValueChange={setServiceStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {serviceRequestStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {requestStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={serviceCategoryFilter} onValueChange={setServiceCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All categories</SelectItem>
                      {serviceRequestCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {requestCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={servicePriorityFilter} onValueChange={setServicePriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All priorities</SelectItem>
                      {serviceRequestPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {requestPriorityLabel(priority)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {serviceRequests.map((request) => (
                  <div key={request.id} className="rounded border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.user.name} ({request.user.email})
                        </p>
                      </div>
                      <Badge variant="outline">{requestStatusLabel(request.status)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {requestCategoryLabel(request.category)} | {requestPriorityLabel(request.priority)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => loadServiceRequestDetails(request.id)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}

                {serviceRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No service requests for current filters.</p>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={servicePage <= 1}
                    onClick={() => setServicePage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <p className="text-xs text-muted-foreground">Page {servicePage} of {serviceTotalPages}</p>
                  <Button
                    variant="outline"
                    disabled={servicePage >= serviceTotalPages}
                    onClick={() => setServicePage((page) => Math.min(serviceTotalPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Detail</CardTitle>
                <CardDescription>Review, change status, and respond with attachments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedServiceRequest ? (
                  <p className="text-sm text-muted-foreground">Select a request to view details.</p>
                ) : (
                  <>
                    <div className="rounded border p-3 text-sm space-y-1">
                      <p className="font-medium">{selectedServiceRequest.title}</p>
                      <p className="text-muted-foreground">{selectedServiceRequest.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedServiceRequest.user.name} ({selectedServiceRequest.user.email})
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Select value={serviceStatusUpdate} onValueChange={setServiceStatusUpdate}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceRequestStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {requestStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={updateServiceRequestStatus}>Update Status</Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Timeline</p>
                      {selectedServiceRequest.timelineEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No timeline entries.</p>
                      ) : (
                        selectedServiceRequest.timelineEvents.map((entry) => (
                          <div key={entry.id} className="rounded border p-2 text-xs">
                            <p className="font-medium">{entry.message}</p>
                            <p className="text-muted-foreground">
                              {entry.actor?.name || "System"} | {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Conversation</p>
                      {selectedServiceRequest.messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No replies yet.</p>
                      ) : (
                        selectedServiceRequest.messages.map((entry) => (
                          <div key={entry.id} className="rounded border p-2 text-xs space-y-1">
                            <p className="font-medium">{entry.sender.name} ({entry.sender.role})</p>
                            <p>{entry.message}</p>
                            {entry.attachments.map((file) => (
                              <a
                                key={file.id}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-primary underline"
                              >
                                {file.fileName}
                              </a>
                            ))}
                          </div>
                        ))
                      )}
                    </div>

                    <Textarea
                      placeholder="Reply to user..."
                      value={serviceReply}
                      onChange={(event) => setServiceReply(event.target.value)}
                    />
                    <div
                      className="rounded-md border-2 border-dashed p-3 text-sm text-muted-foreground"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        uploadServiceReplyFiles(event.dataTransfer.files)
                      }}
                    >
                      <p className="mb-2 font-medium text-foreground">Attach reply files</p>
                      <Input type="file" multiple onChange={(event) => uploadServiceReplyFiles(event.target.files)} />
                    </div>
                    {serviceUploading && (
                      <p className="text-xs text-muted-foreground">Uploading... {serviceUploadProgress}%</p>
                    )}
                    {serviceReplyFiles.map((file, index) => (
                      <div key={`${file.url}-${index}`} className="rounded border p-2 flex justify-between text-xs">
                        <span>{file.fileName}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setServiceReplyFiles((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button onClick={sendServiceRequestReply} disabled={!serviceReply.trim()}>
                      Send Reply
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Project</CardTitle>
                <CardDescription>Add complete project data, upload media, and manage publish status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Project title" value={projectForm.title} onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))} />
                <Select value={projectForm.category} onValueChange={(v) => setProjectForm((p) => ({ ...p, category: v as typeof p.category }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEB">Web</SelectItem>
                    <SelectItem value="MOBILE">Mobile</SelectItem>
                    <SelectItem value="AI">AI</SelectItem>
                    <SelectItem value="SAAS">SaaS</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Technologies (comma separated)" value={projectForm.technologies} onChange={(e) => setProjectForm((p) => ({ ...p, technologies: e.target.value }))} />
                <Textarea placeholder="Short description" value={projectForm.shortDescription} onChange={(e) => setProjectForm((p) => ({ ...p, shortDescription: e.target.value }))} />
                <Textarea placeholder="Detailed description" value={projectForm.detailedDescription} onChange={(e) => setProjectForm((p) => ({ ...p, detailedDescription: e.target.value }))} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Client name" value={projectForm.clientName} onChange={(e) => setProjectForm((p) => ({ ...p, clientName: e.target.value }))} />
                  <Input type="date" value={projectForm.completionDate} onChange={(e) => setProjectForm((p) => ({ ...p, completionDate: e.target.value }))} />
                </div>
                <Input placeholder="Cover image URL (optional)" value={projectForm.coverImageUrl} onChange={(e) => setProjectForm((p) => ({ ...p, coverImageUrl: e.target.value }))} />
                <Input placeholder="Demo video URL (optional)" value={projectForm.demoVideoUrl} onChange={(e) => setProjectForm((p) => ({ ...p, demoVideoUrl: e.target.value }))} />
                <Input placeholder="Live link (https://...)" value={projectForm.liveLink} onChange={(e) => setProjectForm((p) => ({ ...p, liveLink: e.target.value }))} />
                <Input placeholder="Repository link (https://...)" value={projectForm.repositoryLink} onChange={(e) => setProjectForm((p) => ({ ...p, repositoryLink: e.target.value }))} />
                <Select value={projectForm.status} onValueChange={(v) => setProjectForm((p) => ({ ...p, status: v as typeof p.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <div
                  className="rounded-md border-2 border-dashed p-4 text-sm text-muted-foreground"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const dropped = event.dataTransfer.files
                    uploadFiles(dropped)
                  }}
                >
                  <p className="mb-2 font-medium text-foreground">Drag and drop files here</p>
                  <Input type="file" multiple onChange={(e) => uploadFiles(e.target.files)} />
                </div>
                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                {uploading && (
                  <p className="text-xs text-muted-foreground">Progress: {uploadProgress}%</p>
                )}
                {media.map((m, i) => (
                  <div key={`${m.url}-${i}`} className="text-xs rounded border p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.fileName}</span>
                      <div className="flex gap-2">
                        {m.type === "IMAGE" && (
                          <Button size="sm" variant="outline" onClick={() => setProjectForm((p) => ({ ...p, coverImageUrl: m.url }))}>
                            Use as cover
                          </Button>
                        )}
                        {m.type === "VIDEO" && (
                          <Button size="sm" variant="outline" onClick={() => setProjectForm((p) => ({ ...p, demoVideoUrl: m.url }))}>
                            Use as demo
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                      </div>
                    </div>
                    {m.type === "IMAGE" && (
                      <MediaImage src={m.url} alt={m.fileName} wrapperClassName="h-24 w-24 rounded border" />
                    )}
                    {m.type === "VIDEO" && (
                      <video src={m.url} className="h-24 w-40 rounded border" controls />
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={createProject}>
                    {editingProjectId ? "Update Project" : "Create Project"}
                  </Button>
                  {editingProjectId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingProjectId(null)
                        setProjectForm(initialProjectForm)
                        setMedia([])
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="rounded border p-3">
                    <MediaImage
                      src={project.coverImageUrl || project.media.find((m) => m.type === "IMAGE")?.url}
                      alt={`${project.title} cover`}
                      wrapperClassName="mb-2 h-28 w-full rounded border"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-xs text-muted-foreground">{project.category} {project.clientName ? `| ${project.clientName}` : ""}</p>
                      </div>
                      <Select
                        value={project.status}
                        onValueChange={(v) =>
                          updateProjectStatus(project, v as ProjectRow["status"])
                        }
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  <p className="text-sm text-muted-foreground">{project.shortDescription}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.completionDate ? `Completed: ${new Date(project.completionDate).toLocaleDateString()}` : "Completion date not set"}
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => editProject(project)}>
                      Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProject(project)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notification Center</CardTitle>
                <CardDescription>Contact/support/registration/system alerts.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={markAllRead}>Mark all read</Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await fetch("/api/admin/notifications", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "clear-read" }),
                    })
                    await loadData()
                  }}
                >
                  Clear read
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded border p-3">
                  <div className="flex justify-between">
                    <p className="font-medium">{notification.title}</p>
                    {!notification.isRead && <Badge>Unread</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support Requests</CardTitle>
              <CardDescription>Monitor support queue and statuses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {support.map((ticket) => (
                <div key={ticket.id} className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.user.name} ({ticket.user.email})
                      </p>
                    </div>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) =>
                        updateSupportStatus(ticket, v as SupportRow["status"])
                      }
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.message}</p>
                  {ticket.replies.map((reply) => (
                    <div key={reply.id} className="rounded bg-muted/40 p-2 text-sm">
                      <p className="font-medium">
                        {reply.sender.name} ({reply.sender.role})
                      </p>
                      <p>{reply.message}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Reply to this ticket..."
                      value={replyMap[ticket.id] || ""}
                      onChange={(e) =>
                        setReplyMap((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                      }
                    />
                    <Button onClick={() => sendSupportReply(ticket)}>Reply</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
