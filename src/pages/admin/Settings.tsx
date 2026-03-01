import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  User,
  Bell,
  Shield,
  Sliders,
  Save,
  Mail,
  Building2,
  Hash,
  MapPin,
  Lock,
  Palette,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import api from "../../services/api"

/* =====================
   TYPES
===================== */

type TabKey =
  | "account"
  | "company"
  | "preferences"
  | "security"
  | "notifications"

type SettingsState = {
  account: {
    name: string
    email: string
    location: string
  }
  company: {
    companyCode: string
    companyName: string
    companyEmail: string
    location: string
  } | null
  preferences: {
    theme: "dark" | "light"
  }
  security: {
    twoFactorEnabled: boolean
  }
  notifications: {
    email: boolean
    inApp: boolean
  }
}

/* =====================
   SIDEBAR CONFIG
===================== */

const tabs: {
  key: TabKey
  label: string
  icon: LucideIcon
}[] = [
  { key: "account", label: "Account", icon: User },
  { key: "company", label: "Company", icon: Building2 },
  { key: "preferences", label: "Preferences", icon: Sliders },
  { key: "security", label: "Security", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
]

/* =====================
   MAIN COMPONENT
===================== */

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("account")
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [twoFAModal, setTwoFAModal] = useState(false)
const [qr, setQr] = useState<string | null>(null)
const [otp, setOtp] = useState("")
const confirmEnable2FA = async () => {
  await api.post("/auth/2fa/enable", { token: otp })

  setOtp("")
  setQr(null)
  setTwoFAModal(false)

  const res = await api.get("/admin/settings")
  setSettings(res.data)
}

  /* FETCH */
  useEffect(() => {
    api.get("/admin/settings").then((res) => setSettings(res.data))
  }, [])

  const handleToggle2FA = async (value: boolean) => {
  if (!settings) return

  if (value) {
    // enable flow
    const res = await api.post("/auth/2fa/setup")
    setQr(res.data.qrCode)
    setTwoFAModal(true)
  } else {
    await api.post("/auth/2fa/disable")
    const res = await api.get("/admin/settings")
    setSettings(res.data)
  }
}

  /* SAVE */
  const saveSettings = async () => {
  if (!settings) return

  try {
    setSaving(true)

    await api.patch("/admin/settings", {
      account: {
        name: settings.account.name,
        location: settings.account.location,
      },
      company: settings.company
        ? {
            companyName: settings.company.companyName,
            location: settings.company.location,
          }
        : undefined,
      preferences: settings.preferences,
      notifications: settings.notifications,
    })

  } finally {
    setSaving(false)
  }
}

  if (!settings) {
    return <div className="p-6 text-slate-400">Loading settings...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold text-white">Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SIDEBAR */}
        <div className="space-y-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                activeTab === key
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-900 text-slate-300"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="md:col-span-3 bg-slate-900 p-6 rounded-xl">
          <AnimatePresence mode="wait">
            {/* ACCOUNT */}
            {activeTab === "account" && (
              <AnimatedSection title="Account Settings">
                <Input
                  label="Full Name"
                  icon={User}
                  value={settings.account.name}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      account: { ...settings.account, name: v },
                    })
                  }
                />

                <Input
                  label="Email"
                  icon={Mail}
                  value={settings.account.email}
                  disabled
                />
                <Input
  label="Location"
  icon={MapPin}
  value={settings.account.location}
  onChange={(v) =>
    setSettings({
      ...settings,
      account: { ...settings.account, location: v },
    })
  }
/>
              </AnimatedSection>
            )}

            {/* COMPANY */}
            {activeTab === "company" && settings.company && (
              <AnimatedSection title="Company Settings">
                <Input
                  label="Company Code"
                  icon={Hash}
                  value={settings.company.companyCode}
                  disabled
                />

                <Input
                  label="Company Name"
                  icon={Building2}
                  value={settings.company.companyName}
                  onChange={(v) =>
  setSettings((prev) => {
    if (!prev || !prev.company) return prev
    return {
      ...prev,
      company: {
        ...prev.company,
        companyName: v,
      },
    }
  })
}
                />

                <Input
  label="Company Email"
  icon={Mail}
  value={settings.company.companyEmail}
  onChange={(v) =>
  setSettings((prev) => {
    if (!prev || !prev.company) return prev
    return {
      ...prev,
      company: {
        ...prev.company,
        companyEmail: v,
      },
    }
  })
}
/>

                <Input
                  label="Address"
                  icon={MapPin}
                  textarea
                  value={settings.company.location}
                  onChange={(v) =>
  setSettings((prev) => {
    if (!prev || !prev.company) return prev
    return {
      ...prev,
      company: {
        ...prev.company,
        location: v,
      },
    }
  })
}
                />
              </AnimatedSection>
            )}

            {/* PREFERENCES */}
            {activeTab === "preferences" && (
              <AnimatedSection title="Preferences">
                <Toggle
                  label="Dark Mode"
                  icon={Palette}
                  checked={settings.preferences.theme === "dark"}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      preferences: { theme: v ? "dark" : "light" },
                    })
                  }
                />
              </AnimatedSection>
            )}

            {/* SECURITY */}
            {activeTab === "security" && (
              <AnimatedSection title="Security">
                <Toggle
  label="Two Factor Authentication"
  icon={Lock}
  checked={settings.security.twoFactorEnabled}
  onChange={handleToggle2FA}
/>
              </AnimatedSection>
            )}
{twoFAModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
    <div className="bg-slate-900 p-6 rounded-xl space-y-4 w-96">
      <h3 className="text-white font-semibold">Enable 2FA</h3>

      {qr && <img src={qr} />}

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        className="w-full p-3 bg-slate-800 rounded"
      />

      <button
        onClick={confirmEnable2FA}
        className="bg-cyan-500 w-full py-2 rounded"
      >
        Enable
      </button>
    </div>
  </div>
)}

            {/* NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <AnimatedSection title="Notifications">
                <Toggle
                  label="Email Notifications"
                  icon={Mail}
                  checked={settings.notifications.email}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        email: v,
                      },
                    })
                  }
                />

                <Toggle
                  label="In-App Notifications"
                  icon={Bell}
                  checked={settings.notifications.inApp}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        inApp: v,
                      },
                    })
                  }
                />
              </AnimatedSection>
            )}
          </AnimatePresence>

          <div className="flex justify-end mt-6">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-cyan-500 px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings

/* =====================
   REUSABLE COMPONENTS
===================== */

const AnimatedSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    {children}
  </motion.div>
)

const Input: React.FC<{
  label: string
  value: string
  onChange?: (v: string) => void
  icon?: LucideIcon
  disabled?: boolean
  textarea?: boolean
}> = ({ label, value, onChange, icon: Icon, disabled, textarea }) => (
  <div className="space-y-2">
    <label className="text-sm text-slate-400">{label}</label>
    <div className="relative">
      {Icon && <Icon size={18} className="absolute left-3 top-3 text-slate-500" />}
      {textarea ? (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white"
        />
      ) : (
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white"
        />
      )}
    </div>
  </div>
)

const Toggle: React.FC<{
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: LucideIcon
}> = ({ label, checked, onChange, icon: Icon }) => (
  <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl">
    <div className="flex items-center gap-3 text-white">
      {Icon && <Icon size={18} />}
      {label}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-5 h-5 accent-cyan-500"
    />
  </div>
)
