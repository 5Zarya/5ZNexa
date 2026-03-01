import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiPlus,
  FiImage,
  FiType,
  FiTrash2,
  FiEdit,
  FiCalendar,
  FiX,
} from "react-icons/fi"
import api from "../../services/api"

/* ================== LOCAL UI COMPONENTS ================== */

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}


function UiCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#0b1220] border border-white/10 p-5",
        className
      )}
    >
      {children}
    </div>
  )
}

function Button({
  children,
  onClick,
  variant = "primary",
  icon,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "ghost"
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition",
        variant === "primary" &&
          "bg-indigo-600 hover:bg-indigo-500 text-white",
        variant === "ghost" &&
          "bg-white/5 hover:bg-white/10 text-white"
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode
  color?: "green" | "yellow" | "gray" | "red"
}) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs rounded-full font-medium",
        color === "green" && "bg-green-500/20 text-green-400",
        color === "yellow" && "bg-yellow-500/20 text-yellow-400",
        color === "gray" && "bg-white/10 text-slate-300"
      )}
    >
      {children}
    </span>
  )
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto custom-scrollbar py-10">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* CONTENT */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  )
}


/* ================= TYPES ================= */

type AnnouncementType = "TEXT" | "IMAGE"
type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED"
type AnnouncementPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

interface Announcement {
  id: string
  type: AnnouncementType
  title?: string
  subtitle?: string
  content?: string
  imageUrl?: string

  themeColor?: string
  textColor?: string

  ctaText?: string
  ctaUrl?: string

  priority: AnnouncementPriority
  pinned: boolean
  dismissible: boolean

  publishAt?: string | null
  expireAt?: string | null

  status: AnnouncementStatus
  createdAt: string
}

/* ================= PAGE ================= */

export default function AnnouncementAdmin() {
  const [data, setData] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] =
    useState<Announcement | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await api.get("/admin/announcements")
    setData(res.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Announcements
          </h1>
          <p className="text-sm text-slate-400">
            Pengumuman & banner untuk dashboard user
          </p>
        </div>

        <Button
          icon={<FiPlus />}
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          New Announcement
        </Button>
      </div>

      {/* LIST */}
      <UiCard>
        {loading ? (
          <div className="h-40 animate-pulse bg-white/5 rounded" />
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            Belum ada announcement
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {item.type === "TEXT" ? (
                      <FiType />
                    ) : (
                      <FiImage />
                    )}
                    <span className="font-medium text-white">
                      {item.title || "Image Announcement"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-1">
                    {item.status} •{" "}
                    {new Date(item.createdAt).toLocaleDateString(
                      "id-ID"
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    color={
                      item.status === "PUBLISHED"
                        ? "green"
                        : item.status === "SCHEDULED"
                        ? "yellow"
                        : "gray"
                    }
                  >
                    {item.status}
                  </Badge>

                  <button
                    onClick={() => {
                      setEditing(item)
                      setOpen(true)
                    }}
                    className="p-2 hover:bg-white/10 rounded"
                  >
                    <FiEdit />
                  </button>

                  <button className="p-2 hover:bg-red-500/20 text-red-400 rounded">
                    <FiTrash2 />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </UiCard>

      {/* MODAL */}
      <AnimatePresence>
        {open && (
          <Modal onClose={() => setOpen(false)}>
            <AnnouncementForm
              data={editing}
              onSuccess={() => {
                setOpen(false)
                fetchData()
              }}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnnouncementForm({
  data,
  onSuccess,
}: {
  data: Announcement | null
  onSuccess: () => void
}) {
  /* ================= STATE ================= */

  const [type, setType] = useState<AnnouncementType>(data?.type ?? "TEXT")
  const [priority, setPriority] =
    useState<AnnouncementPriority>(data?.priority ?? "NORMAL")

  const [publishAt, setPublishAt] = useState<string | null>(
    data?.publishAt ?? null
  )
  const [expireAt, setExpireAt] = useState<string | null>(
    data?.expireAt ?? null
  )

  const [title, setTitle] = useState(data?.title ?? "")
  const [content, setContent] = useState(data?.content ?? "")

  const [themeColor, setThemeColor] = useState(
    data?.themeColor ?? "#0f172a"
  )
  const [textColor, setTextColor] = useState(
    data?.textColor ?? "#ffffff"
  )

  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
  data?.imageUrl ?? null
)
  const [pinned, setPinned] = useState(data?.pinned ?? false)

  const [layout, setLayout] =
    useState<"CENTER" | "LEFT" | "RIGHT">("CENTER")
  const [gradientFrom, setGradientFrom] =
    useState("#6366f1")
  const [gradientTo, setGradientTo] =
    useState("#9333ea")

  /* ================= SUBMIT ================= */

  const submit = async () => {
    let imageUrl = data?.imageUrl

    if (type === "IMAGE" && image) {
      const form = new FormData()
      form.append("file", image)

      const upload = await api.post(
        "/admin/announcements/upload-image",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )

      imageUrl = upload.data.url
    }

    const payload = {
  type,
  imageUrl,
  pinned,
  priority,
  publishAt,
  expireAt,

  ...(type === "TEXT" && {
    title,
    content,
    themeColor,
    textColor,
    layout,
    gradientFrom,
    gradientTo,
  }),
}

    data
      ? await api.put(`/admin/announcements/${data.id}`, payload)
      : await api.post("/admin/announcements", payload)

    onSuccess()
  }

  function UserPreview({
  announcement,
}: {
  announcement: {
    type: AnnouncementType
    title?: string
    content?: string
    themeColor?: string
    textColor?: string
    imagePreview?: string | null
  }
}) {
  if (announcement.type === "IMAGE" && announcement.imagePreview) {
    return (
      <img
        src={announcement.imagePreview}
        alt="Announcement"
        className="rounded-xl w-full max-h-[240px] object-cover border border-white/10"
      />
    )
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: announcement.themeColor ?? "#0f172a",
        color: announcement.textColor ?? "#fff",
      }}
    >
      <div className="font-semibold">
        {announcement.title || "Announcement title"}
      </div>
      <div className="text-sm opacity-90">
        {announcement.content || "Announcement content"}
      </div>
    </div>
  )
}
  /* ================= RENDER ================= */

  return (
    <UiCard className="w-[560px] max-h-[85vh] overflow-y-auto space-y-6">
      {/* ================= HEADER ================= */}
  <div className="flex justify-between items-center">
    <h2 className="text-lg font-semibold text-white">
      {data ? "Edit" : "New"} Announcement
    </h2>
    <button onClick={onSuccess}>
      <FiX />
    </button>
  </div>

      {/* ================= TYPE ================= */}
      <div className="flex gap-2">
        <Button
          variant={type === "TEXT" ? "primary" : "ghost"}
          onClick={() => setType("TEXT")}
        >
          Text
        </Button>
        <Button
          variant={type === "IMAGE" ? "primary" : "ghost"}
          onClick={() => setType("IMAGE")}
        >
          Image
        </Button>
      </div>

      {/* ================= META ================= */}
      <div className="space-y-3">
        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as AnnouncementPriority)
          }
          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2"
        >
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="datetime-local"
            value={publishAt ?? ""}
            onChange={(e) => setPublishAt(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2"
          />
          <input
            type="datetime-local"
            value={expireAt ?? ""}
            onChange={(e) => setExpireAt(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2"
          />
        </div>

        {priority === "URGENT" && (
          <Badge color="red">URGENT</Badge>
        )}
      </div>

      {type === "TEXT" && (
  <div className="space-y-3">
    <input
      className="w-full bg-white/5 rounded px-4 py-2"
      placeholder="Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />

    <textarea
      rows={4}
      className="w-full bg-white/5 rounded px-4 py-2"
      placeholder="Content"
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  </div>
)}

      {/* ================= TEXT DESIGN ================= */}
      {type === "TEXT" && (
        <div className="flex gap-3">
          <input
            type="color"
            value={themeColor}
            onChange={(e) => setThemeColor(e.target.value)}
          />
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
          />
        </div>
      )}

      {/* ================= IMAGE DESIGN ================= */}
      {type === "TEXT" && (
  <UiCard>
    <p className="text-sm text-slate-400 mb-3">
      Banner Designer
    </p>

    <select
      value={layout}
      onChange={(e) => setLayout(e.target.value as any)}
      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 mb-3"
    >
      <option value="CENTER">Center</option>
      <option value="LEFT">Left</option>
      <option value="RIGHT">Right</option>
    </select>

    <div className="flex gap-3 mb-4">
      <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} />
      <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} />
    </div>

    <div
      className="rounded-xl p-6 min-h-[160px] flex items-center"
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        justifyContent:
          layout === "CENTER"
            ? "center"
            : layout === "LEFT"
            ? "flex-start"
            : "flex-end",
      }}
    >
      <div className="max-w-md">
        <h3 className="text-xl font-bold text-white">
          {title || "Announcement title"}
        </h3>
        <p className="text-sm text-white/90">
          {content || "Announcement description"}
        </p>
      </div>
    </div>
  </UiCard>
)}

          {type === "IMAGE" && (
  <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }}
/>
)}

      {/* ================= ACTION ================= */}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={pinned}
          onChange={() => setPinned(!pinned)}
        />
        Pin to user dashboard
      </label>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onSuccess}>
          Cancel
        </Button>
        <Button onClick={submit}>Save</Button>
      </div>
      
      <div className="mt-6">
  <p className="text-xs text-slate-400 mb-2">
    Preview (User View)
  </p>

  <UserPreview
  announcement={{
    type,
    title,
    content,
    themeColor,
    textColor,
    imagePreview,
  }}
/>
</div>
    </UiCard>
  )
}