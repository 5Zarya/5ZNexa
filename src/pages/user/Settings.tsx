import { useState } from "react"
import { motion } from "framer-motion"
import {
  FiUser,
  FiShield,
  FiSliders,
  FiTrash2,
} from "react-icons/fi"
import { useAuthStore } from "../../stores/auth"
import api from "../../services/api"

type Tab = "profile" | "security" | "preferences" | "danger"

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile", label: "Profil", icon: FiUser },
  { id: "security", label: "Keamanan", icon: FiShield },
  { id: "preferences", label: "Preferensi", icon: FiSliders },
  { id: "danger", label: "Danger Zone", icon: FiTrash2 },
]

const Settings = () => {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [tab, setTab] = useState<Tab>("profile")
  const [loading, setLoading] = useState(false)

  /* ================= PROFILE ================= */
  const [name, setName] = useState(user?.name ?? "")

  /* ================= SECURITY ================= */
  const [twoFA, setTwoFA] = useState(Boolean((user as any)?.twoFAEnabled))

  /* ================= PREFERENCES ================= */
  const [theme, setTheme] = useState<"light" | "dark">(
    ((user as any)?.theme as any) ?? "dark"
  )
  const [language, setLanguage] = useState(
    ((user as any)?.language as string) ?? "id"
  )
  const [twoFAModal, setTwoFAModal] = useState(false)
const [qr, setQr] = useState<string | null>(null)
const [otp, setOtp] = useState("")


  const saveSettings = async () => {
    try {
      setLoading(true)
      const res = await api.put("/user/settings", {
        name,
        twoFA,
        theme,
        language,
      })

      if (res.data?.user) {
        setUser(res.data.user)
      }
    } finally {
      setLoading(false)
    }
  }

  const confirmEnable2FA = async () => {
  await api.post("/auth/2fa/enable", { token: otp })

  setOtp("")
  setQr(null)
  setTwoFAModal(false)
  setTwoFA(true)
}

  const handleToggle2FA = async (value: boolean) => {
  if (value) {
    const res = await api.post("/auth/2fa/setup")
    console.log(res.data)
    setQr(res.data.qrCode)
    setTwoFAModal(true)
  } else {
    await api.post("/auth/2fa/disable")
    setTwoFA(false)
  }
}

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      {/* ================= HEADER ================= */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Pengaturan Akun
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Kelola profil, keamanan, dan preferensi akun Anda
        </p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-10">
        {/* ================= SIDEBAR ================= */}
        <aside
          className="
            bg-[#0b0f14]/70 backdrop-blur-xl
            border border-white/10
            rounded-3xl
            p-5
          "
        >
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
            Account
          </p>

          <div className="space-y-1">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`
                    relative w-full flex items-center gap-3
                    px-4 py-3 rounded-xl text-sm
                    transition-all
                    ${
                      active
                        ? "text-orange-400 bg-white/5"
                        : "text-gray-400 hover:bg-white/5"
                    }
                  `}
                >
                  {active && (
                    <span className="absolute left-0 top-2 h-8 w-1 rounded-full bg-orange-400" />
                  )}
                  <t.icon className="text-lg" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ================= CONTENT ================= */}
        <motion.section
          key={tab}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="
            bg-[#0b0f14]/70 backdrop-blur-xl
            border border-white/10
            rounded-3xl
            p-10
          "
        >
          {/* ========== PROFILE ========== */}
          {tab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-200">
                  Informasi Profil
                </h2>
                <p className="text-sm text-gray-500">
                  Perbarui informasi dasar akun Anda
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Nama Lengkap
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="
                    w-full rounded-xl px-4 py-3
                    bg-white/5 text-white
                    border border-white/10
                    focus:outline-none focus:ring-2
                    focus:ring-orange-500/40
                  "
                />
              </div>
            </div>
          )}

          {/* ========== SECURITY ========== */}
          {tab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-200">
                  Keamanan Akun
                </h2>
                <p className="text-sm text-gray-500">
                  Lindungi akun Anda dengan pengamanan tambahan
                </p>
              </div>

              <label className="
                flex items-center justify-between
                p-5 rounded-2xl
                bg-white/5 border border-white/10
              ">
                <div>
                  <p className="font-medium text-gray-200">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-gray-500">
                    Aktifkan verifikasi dua langkah
                  </p>
                </div>
                <input
  type="checkbox"
  checked={twoFA}
  onChange={(e) => handleToggle2FA(e.target.checked)}
  className="scale-125 accent-orange-400"
/>
              </label>
            </div>
          )}

          {/* ========== PREFERENCES ========== */}
          {tab === "preferences" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-200">
                  Preferensi
                </h2>
                <p className="text-sm text-gray-500">
                  Sesuaikan pengalaman penggunaan Anda
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Tema
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="
                      w-full rounded-xl px-4 py-3
                      bg-white/5 text-white
                      border border-white/10
                    "
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Bahasa
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="
                      w-full rounded-xl px-4 py-3
                      bg-white/5 text-white
                      border border-white/10
                    "
                  >
                    <option value="id">Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========== DANGER ========== */}
          {tab === "danger" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-red-400">
                  Danger Zone
                </h2>
                <p className="text-sm text-red-400/70">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>

              <div className="
                border border-red-500/20
                bg-red-500/5
                rounded-2xl p-6
              ">
                <button
                  className="
                    px-5 py-3 rounded-xl
                    bg-red-500/10 text-red-400
                    hover:bg-red-500/20
                    transition
                  "
                >
                  Hapus Akun Permanen
                </button>
              </div>
            </div>
          )}

          {/* ================= FOOTER ================= */}
          <div className="mt-10 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={loading}
              className="
                px-6 py-3 rounded-xl
                bg-gradient-to-br from-orange-400 to-orange-600
                text-black font-medium
                shadow-lg shadow-orange-500/30
                hover:brightness-110
                disabled:opacity-60
                transition
              "
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </motion.section>
      </div>
      {twoFAModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
    <div className="bg-[#0b0f14] p-6 rounded-xl space-y-4 w-96">
      <h3 className="text-white font-semibold">Enable 2FA</h3>

      {qr && <img src={qr} />}

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        className="w-full p-3 bg-white/5 rounded text-white"
      />

      <button
        onClick={confirmEnable2FA}
        className="bg-orange-500 w-full py-2 rounded"
      >
        Enable
      </button>
    </div>
  </div>
)}

    </div>
  )
}

export default Settings
