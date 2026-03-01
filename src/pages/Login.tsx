import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import ParticleBackground from "./ParticleBackground";
import Logo from "../assets/images/5Z.png";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api"

type Role = "admin" | "user";
type Mode = "login" | "register" | "forgot";

const Login: React.FC = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ===== COMMON =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ===== ADMIN =====
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const companyCode =
    "5ZNX-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // ===== USER =====
  const [name, setName] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [inputCompanyCode, setInputCompanyCode] = useState("");
  const [companyCodeError, setCompanyCodeError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false)
const [tempToken, setTempToken] = useState("")
const [otp, setOtp] = useState("")
const isOtpStep = requires2FA;

  const resetFlow = () => {
    setRole(null);
    setMode("login");
  };

  const validateCompanyCode = async (code: string) => {

  setInputCompanyCode(code);

  if (!code) {
    setCompanyCodeError("");
    return;
  }

  try {

    await api.post("/company/validate", { code });

    setCompanyCodeError("");

  } catch {

    setCompanyCodeError("Kode perusahaan tidak ditemukan");

  }
};

  // ===== 3D PARALLAX =====
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  // ===== EYE TRACKING (HOOKS HARUS DI ATAS) =====
const eyeX = useTransform(mouseX, [-300, 300], [-22, 22]);
const eyeY = useTransform(mouseY, [-300, 300], [-22, 22]);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);
  // AI Eye tracking (limit movement)
// ===== AI STATES =====
const [isThreat, setIsThreat] = useState(false);
const [isLockOn, setIsLockOn] = useState(false);
const [isBlink, setIsBlink] = useState(false);
// AI Blink system
React.useEffect(() => {
  const blinkInterval = setInterval(() => {
    setIsBlink(true);
    setTimeout(() => setIsBlink(false), 180);
  }, 8000);

  return () => clearInterval(blinkInterval);
}, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const { login, register, user, loading, authReady } = useAuth();

const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    if (mode === "login") {
  if (!role) {
    alert("Silakan pilih role");
    return;
  }

  // ⭐ STEP OTP
  if (isOtpStep) {
    await verifyLogin2FA();
    return;
  }

  // ⭐ STEP LOGIN PASSWORD
  const res = await login(email, password, role);

  if (res?.requires2FA) {
    setTempToken(res.tempToken);
    setRequires2FA(true);
    setSubmitting(false);
    return;
  }

  if (!res?.user) throw new Error("Login failed");

  if (res.user.role !== role) {
    setIsThreat(true);
    alert("Email atau password salah");
    return;
  }
}

    if (mode === "register") {
  if (role === "admin") {
  await api.post("/auth/register/admin",{
      role,
      email,
      password,
      name: companyName, // nama company admin
      location: companyLocation,
      phone: companyPhone,
    });
  }

  if (role === "user") {
  if (password !== passwordConfirm) {
    alert("Password tidak sama");
    return;
  }

  await api.post("/auth/register/user", {
    role,
    email,
    password,
    name,
    phone: userPhone,      // ✅ KIRIM
    location: userLocation, // ✅ KIRIM
    companyCode: inputCompanyCode,
  });
}

  setMode("login");
}
  } catch (err) {
    console.error(err);
    setIsThreat(true);
  } finally {
    setSubmitting(false);
  }
};

useEffect(() => {

  if (!authReady) return;
  if (!user) return;

  if (user.role === "admin") {

    navigate("/admin/dashboard", { replace: true });

  } else {

    navigate("/user/dashboard", { replace: true });

  }

}, [user, authReady, navigate]);

const handleForgotPassword = async () => {

  if (!email) {
    alert("Masukkan email");
    return;
  }

  try {

    await api.post("/auth/forgot-password", {
      email
    });

    alert("Link reset password dikirim");

  } catch {

    alert("Gagal kirim reset password");

  }
};
const { saveTokens, refresh } = useAuth();

const verifyLogin2FA = async () => {
  if (!otp) {
    alert("Masukkan OTP");
    return;
  }

  try {
    const res = await api.post("/auth/2fa/verify-login", {
      tempToken,
      otp,
    });

    saveTokens(res.data.accessToken, res.data.refreshToken, true);

    await refresh();

    // ⭐ reset state
    setRequires2FA(false);
    setOtp("");
    setTempToken("");

  } catch {
    alert("OTP salah");
  }
};

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen overflow-hidden bg-black perspective-[1800px]"
    >
      <ParticleBackground />

      {/* ===== 3D CYBER BACKGROUND ===== */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#22d3ee25,transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#f59e0b20,transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#000, #050b16, #000)]" />

      {/* GRID */}
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(transparent_95%,rgba(255,255,255,0.1)_100%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.1)_100%)] bg-[size:40px_40px]" />

      {/* ===== CONTENT ===== */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-10">
        <motion.div
          style={{ rotateX, rotateY }}
          className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-14"
        >
          {/* ===== LEFT : AI ROBOT CORE ===== */}
<motion.div
  className="relative rounded-[40px] overflow-hidden
  bg-black border border-cyan-500/30
  shadow-[0_0_120px_-20px_rgba(34,211,238,0.6)]"
>
  {/* BACKGROUND GRID */}
  <div className="absolute inset-0 bg-[linear-gradient(transparent_92%,rgba(34,211,238,0.08)),linear-gradient(90deg,transparent_92%,rgba(34,211,238,0.08))] bg-[size:32px_32px]" />

  {/* CORE ENERGY */}
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
    className="absolute inset-[-40%] rounded-full
    bg-[conic-gradient(from_0deg,#22d3ee10,#22d3ee40,#22d3ee10)]"
  />

  {/* ===== AI EYE SENSOR : ADVANCED ===== */}
<div className="absolute inset-0 flex items-center justify-center">

  {/* OUTER RING */}
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
    className={`absolute w-72 h-72 rounded-full border
      ${isThreat ? "border-red-500/40" : "border-cyan-400/30"}`}
  />

  {/* INNER RING */}
  <motion.div
    animate={{ rotate: -360 }}
    transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
    className={`absolute w-56 h-56 rounded-full border-dashed
      ${isThreat ? "border-red-400/60" : "border-cyan-300/50"}`}
  />

  {/* IRIS */}
  <motion.div
    style={{
      x: isLockOn ? 0 : eyeX,
      y: isLockOn ? 0 : eyeY,
      scaleY: isBlink ? 0.1 : 1,
    }}
    animate={{
      opacity: isThreat ? 1 : [0.6, 1, 0.6],
    }}
    transition={{ duration: 0.15 }}
    className={`absolute w-40 h-40 rounded-full
      ${isThreat
        ? "bg-[radial-gradient(circle,#ff3b3b55,transparent_65%)]"
        : "bg-[radial-gradient(circle,#22d3ee55,transparent_65%)]"
      }`}
  />

  {/* PUPIL */}
<motion.div
  style={{
    x: isLockOn ? 0 : eyeX,
    y: isLockOn ? 0 : eyeY,
    scaleY: isBlink ? 0.1 : 1,
  }}
  animate={{
    boxShadow: isThreat
      ? "0 0 60px #ff3b3b"
      : "0 0 60px #22d3ee",
  }}
  transition={{ duration: 0.15 }}
  className={`absolute w-16 h-16 rounded-full
    ${isThreat ? "bg-red-500" : "bg-cyan-400"}`}
 />

  {/* CROSSHAIR */}
  <div className="absolute w-64 h-64 pointer-events-none">
    <span className={`absolute left-1/2 top-0 w-[1px] h-full ${isThreat ? "bg-red-400/50" : "bg-cyan-400/40"}`} />
    <span className={`absolute top-1/2 left-0 h-[1px] w-full ${isThreat ? "bg-red-400/50" : "bg-cyan-400/40"}`} />
  </div>

  {/* SCAN */}
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
    className={`absolute w-72 h-72 rounded-full
      ${isThreat
        ? "bg-[conic-gradient(from_0deg,transparent_80%,rgba(255,59,59,0.4),transparent)]"
        : "bg-[conic-gradient(from_0deg,transparent_80%,rgba(34,211,238,0.35),transparent)]"
      }`}
  />
</div>

  {/* SCANNING LINE */}
  <motion.div
    animate={{ y: ["-120%", "120%"] }}
    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
    className="absolute left-0 w-full h-[2px]
    bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
  />

  {/* CONTENT */}
  <div className="relative z-10 p-12 h-full flex flex-col justify-between">
    <div>
      <h1 className="text-5xl font-extrabold tracking-widest
        bg-gradient-to-r from-cyan-300 via-white to-cyan-300
        bg-clip-text text-transparent">
        5ZNEXA
      </h1>
      <p className="mt-4 text-cyan-300 text-sm tracking-[0.3em]">
        ARTIFICIAL INTELLIGENCE CORE
      </p>
    </div>

    <div className="text-xs text-cyan-400 tracking-[0.4em] opacity-80">
      NEURAL · AUTONOMOUS · SENTIENT
    </div>
  </div>
</motion.div>

          {/* ===== AUTH CARD ===== */}
          <motion.div onMouseEnter={() => setIsThreat(true)}
  onMouseLeave={() => setIsThreat(false)}
  className="relative rounded-[38px]">
            <div className="absolute inset-0 rounded-[40px]
              bg-[conic-gradient(from_180deg,#22d3ee,#f59e0b,#fb923c,#22d3ee)]
              animate-spin-slow blur-[1px]" />

            <div className="relative rounded-[38px] bg-[#060b14]/95 backdrop-blur-3xl border border-white/10 p-10">
              <h2 className="text-3xl font-semibold text-white mb-2">
                {mode === "login"
                  ? "System Authentication"
                  : mode === "register"
                  ? "Account Registration"
                  : "Account Recovery"}
              </h2>

              <p className="text-sm text-gray-400 mb-8">
                {mode === "forgot"
                  ? "Reset akses akun Anda"
                  : role
                  ? `Access Level: ${role.toUpperCase()}`
                  : "Pilih jenis akun"}
              </p>

              {/* ROLE */}
              {!role && (
                <div className="grid grid-cols-2 gap-5">
                  {(["admin", "user"] as Role[]).map((r) => (
                    <motion.button
                      key={r}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setRole(r)}
                      className="relative p-6 rounded-2xl bg-black/40
                      border border-white/10 hover:border-cyan-400 transition"
                    >
                      <div className="text-lg font-semibold text-white capitalize">
                        {r}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {r === "admin"
                          ? "Manajemen & konfigurasi"
                          : "Akses internal sistem"}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* FORM */}
<AnimatePresence mode="wait">
  {role && mode !== "forgot" && (
    <form onSubmit={handleSubmit}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-5"
      >
        {/* ===== LOGIN ===== */}
        {mode === "login" && (
          <>
            <Input label="Email" value={email} setValue={setEmail} />
            <PasswordInput
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
            {requires2FA && (
  <>
    <div className="text-xs text-cyan-400">
      Two-Factor Authentication Required
    </div>

    <Input label="OTP Code" value={otp} setValue={setOtp} />
  </>
)}
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-right text-xs text-cyan-400"
            >
              Forgot password?
            </button>
          </>
        )}

        {/* ===== REGISTER ADMIN ===== */}
        {mode === "register" && role === "admin" && (
          <>
            <Input label="Email" value={email} setValue={setEmail} />
                        <PasswordInput {...{ password, setPassword, showPassword, setShowPassword }} />
                        <Input label="Company Name" value={companyName} setValue={setCompanyName} />
                        <Input label="Company Location"value={companyLocation}setValue={setCompanyLocation}/>
                        <Input label="Company Phone" value={companyPhone} setValue={setCompanyPhone} />
                        <Checkbox label="Agree Terms" checked={agreeTerms} setChecked={setAgreeTerms} />
                        <Checkbox label="Agree Privacy Policy" checked={agreePrivacy} setChecked={setAgreePrivacy} />

            {agreeTerms && agreePrivacy && (
              <div className="p-4 rounded-xl bg-black/40 border border-cyan-400/30 text-cyan-300">
                <div className="text-xs opacity-70">Company Code</div>
                <div className="font-mono tracking-widest text-lg">
                  {companyCode}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== REGISTER USER ===== */}
        {mode === "register" && role === "user" && (
          <>
            <Input label="Full Name" value={name} setValue={setName} />
            <Input label="Email" value={email} setValue={setEmail} />
            <PasswordInput {...{ password, setPassword, showPassword, setShowPassword }} />
            <Input label="Confirm Password" value={passwordConfirm} setValue={setPasswordConfirm} />
            <Input label="Location" value={userLocation} setValue={setUserLocation} placeholder="Jakarta, Indonesia"/>
            <Input label="Company Code" value={inputCompanyCode} setValue={validateCompanyCode} />
            {companyCodeError && (
              <div className="text-xs text-red-400">{companyCodeError}</div>
            )}
            <Input label="Phone" value={userPhone} setValue={setUserPhone} />
          </>
        )}

        {/* ===== SUBMIT ===== */}
        <button
          type="submit"
          disabled={submitting}
          onMouseEnter={() => setIsLockOn(true)}
          onMouseLeave={() => setIsLockOn(false)}
          className="w-full py-4 rounded-xl font-semibold text-black
          bg-gradient-to-r from-cyan-300 via-amber-300 to-orange-400"
        >
          {submitting
  ? "Processing..."
  : isOtpStep
  ? "Verify OTP"
  : mode === "login"
  ? "Login"
  : "Register"}
        </button>

        {/* ===== FOOTER ===== */}
        <div className="flex justify-between text-xs text-gray-400 pt-2">
          <button type="button" onClick={resetFlow}>
            ← Change Role
          </button>
          <button
            type="button"
            onClick={() =>
              setMode(mode === "login" ? "register" : "login")
            }
            className="text-cyan-400"
          >
            {mode === "login" ? "Create account" : "Back to login"}
          </button>
        </div>
      </motion.div>
    </form>
  )}

  {mode === "forgot" && (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <Input label="Registered Email" value={email} setValue={setEmail} />
      <button
      onClick={handleForgotPassword}
        type="button"
        className="w-full py-4 rounded-xl bg-cyan-400 text-black font-semibold"
      >
        Send Reset Link
      </button>
      <button
        type="button"
        onClick={() => setMode("login")}
        className="text-xs text-gray-400 w-full"
      >
        ← Back to login
      </button>
    </motion.div>
  )}
</AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

/* ===== COMPONENTS ===== */

const Input = ({ label, value, setValue }: any) => (
  <label className="block text-sm text-gray-300">
    {label}
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full mt-1 px-4 py-3 rounded-xl bg-black/50
      border border-white/10 text-gray-200
      focus:outline-none focus:border-cyan-400"
    />
  </label>
);

const PasswordInput = ({ password, setPassword, showPassword, setShowPassword }: any) => (
  <label className="block text-sm text-gray-300">
    Password
    <div className="relative mt-1">
      <input
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-gray-200"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400"
      >
        {showPassword ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  </label>
);

const Checkbox = ({ label, checked, setChecked }: any) => (
  <label className="flex items-center gap-2 text-sm text-gray-300">
    <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
    {label}
  </label>
);

export default Login;
