// src/pages/user/Profile.tsx
import React, { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Shield,
  Camera,
  Save,
  Loader2,
} from "lucide-react"
import { useAuthStore } from "../../stores/auth"
import api from "../../services/api"

/* ================= TYPES ================= */

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  jobTitle: string | null
  department: string | null
  bio: string | null
  location: string | null
  createdAt: string
}

/* ================= COMPONENT ================= */

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<Partial<UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const updateAvatar = useAuthStore((s) => s.updateAvatar)

  /* ================= FETCH PROFILE ================= */

  useEffect(() => {
    api.get("/user/profile")
      .then(res => {
        setProfile(res.data)
        setForm(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  /* ================= HANDLERS ================= */

  const updateField = (key: keyof UserProfile, value: any) => {
    setForm(s => ({ ...s, [key]: value }))
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      await api.put("/user/profile", form)
      setProfile(p => ({ ...(p as UserProfile), ...(form as UserProfile) }))
      alert("Profile updated")
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async () => {
  if (!avatarFile) return

  const fd = new FormData()
  fd.append("avatar", avatarFile)

  const res = await api.post("/user/avatar", fd, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  const newAvatarUrl = res.data.avatarUrl

  // ✅ Update local profile (biar halaman ini berubah)
  setProfile(p => p ? { ...p, avatarUrl: newAvatarUrl } : p)

  // 🔥 UPDATE ZUSTAND (BIAR NAVBAR BERUBAH)
  updateAvatar(newAvatarUrl)

  setAvatarFile(null)
  if (fileRef.current) fileRef.current.value = ""
}

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading profile…
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen p-8 bg-[#020617] text-slate-200">
      <div className="max-w-5xl mx-auto grid grid-cols-12 gap-6">

        {/* ================= LEFT: IDENTITY ================= */}
        <motion.div className="col-span-4">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">

            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
  src={
    profile.avatarUrl
      ? `http://localhost:4000${profile.avatarUrl}`
      : "/avatar-placeholder.png"
  }
  className="w-28 h-28 rounded-full object-cover border border-slate-700"
/>
                <label className="absolute bottom-0 right-0 p-2 rounded-full bg-cyan-500 cursor-pointer">
                  <Camera size={14} />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setAvatarFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {avatarFile && (
                <button
                  onClick={uploadAvatar}
                  className="mt-3 text-xs px-3 py-1 rounded bg-cyan-500 text-black"
                >
                  Upload Avatar
                </button>
              )}

              <div className="mt-4 text-center">
                <div className="font-semibold text-lg">{profile.name}</div>
                <div className="text-xs text-slate-400">{profile.email}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <Row icon={Briefcase} label="Job" value={profile.jobTitle} />
              <Row icon={Building2} label="Department" value={profile.department} />
              <Row
                icon={Shield}
                label="Member since"
                value={new Date(profile.createdAt).toLocaleDateString()}
              />
            </div>
          </div>
        </motion.div>

        {/* ================= RIGHT: EDITABLE ================= */}
        <motion.div className="col-span-8">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">

            <Section title="Personal Information" />

            <Input
              label="Full Name"
              icon={User}
              value={form.name}
              onChange={v => updateField("name", v)}
            />

            <Input
              label="Phone"
              icon={Phone}
              value={form.phone}
              onChange={v => updateField("phone", v)}
            />

            <Input
              label="Location"
              icon={MapPin}
              value={form.location}
              onChange={v => updateField("location", v)}
            />

            <Textarea
              label="Bio"
              value={form.bio}
              onChange={v => updateField("bio", v)}
            />

            <button
              disabled={saving}
              onClick={saveProfile}
              className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ================= UI ATOMS ================= */

function Section({ title }: { title: string }) {
  return <div className="text-sm font-semibold text-slate-300">{title}</div>
}

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-slate-400" />
      <div className="text-slate-400 text-xs w-20">{label}</div>
      <div className="text-white text-sm">{value ?? "—"}</div>
    </div>
  )
}

interface InputProps {
  label: string
  icon: React.ElementType
  value?: string | null
  onChange: (value: string) => void
}

function Input({ label, icon: Icon, value, onChange }: InputProps) {

  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <Icon size={14} className="text-slate-500" />
        <input
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-slate-800 rounded-lg px-3 py-2 border border-slate-700"
        />
      </div>
    </div>
  )
}

interface TextareaProps {
  label: string
  value?: string | null
  onChange: (value: string) => void
}

function Textarea({ label, value, onChange }: TextareaProps) {

  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <textarea
        rows={3}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 mt-1"
      />
    </div>
  )
}
