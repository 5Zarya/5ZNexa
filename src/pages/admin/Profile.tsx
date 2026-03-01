import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  LogOut,
  Pencil,
  Save,
  X,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

type AdminProfileData = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  createdAt: string;
};

const AdminProfile: React.FC = () => {
  const { logout } = useAuth();

  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setProfile(res.data);
      setForm({
        name: res.data.name ?? "",
        phone: res.data.phone ?? "",
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const saveProfile = async () => {
  try {
    setSaving(true);

    // 1️⃣ update name & phone
    const res = await api.patch("/auth/me", form);
    let updatedProfile = res.data;

    // 2️⃣ upload avatar
    if (avatarFile instanceof File) {
      const fd = new FormData();
      fd.append("file", avatarFile, avatarFile.name);

      const avatarRes = await api.post("/auth/avatar", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      updatedProfile.avatar = avatarRes.data.avatar;
    }

    setProfile(updatedProfile);
    setEditMode(false);
    setAvatarFile(null);
  } catch (err) {
    console.error(err);
    alert("Failed to update profile");
  } finally {
    setSaving(false);
  }
};

  if (loading)
    return (
      <div className="flex justify-center py-20 text-slate-400">
        Loading profile...
      </div>
    );

  if (!profile)
    return (
      <div className="text-center text-red-400">
        Failed to load profile
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10
        border border-slate-700 rounded-2xl p-6"
      >
        <div className="flex items-center gap-5">
          {/* AVATAR */}
          <div className="relative">
            {profile.avatar ? (
              <img
                src={`http://localhost:4000${profile.avatar}`}
                className="w-20 h-20 rounded-full object-cover border border-slate-600"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-cyan-500/20
              flex items-center justify-center text-cyan-400">
                <User size={36} />
              </div>
            )}

            {editMode && (
              <label className="absolute inset-0 bg-black/40
              rounded-full flex items-center justify-center
              text-white text-xs cursor-pointer">
                <ImageIcon size={16} />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAvatarFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* NAME + ROLE */}
          <div className="flex-1">
            {editMode ? (
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="bg-slate-800 border border-slate-600
                rounded-lg px-3 py-1 text-white text-lg font-semibold w-full"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white">
                {profile.name}
              </h2>
            )}
            <p className="text-slate-400 capitalize">{profile.role}</p>
          </div>

          {/* EDIT TOGGLE */}
          <button
            onClick={() => setEditMode(!editMode)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            {editMode ? <X /> : <Pencil />}
          </button>
        </div>
      </motion.div>

      {/* INFO */}
      <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white">
          Personal Information
        </h3>

        <InfoRow icon={Mail} label="Email" value={profile.email} />

        <InfoRow
          icon={Phone}
          label="Phone"
          value={
            editMode ? (
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="Enter phone number"
                className="bg-slate-800 border border-slate-600
                rounded-lg px-3 py-1 text-white w-full"
              />
            ) : (
              profile.phone || "-"
            )
          }
        />

        <InfoRow
          icon={Shield}
          label="Joined At"
          value={new Date(profile.createdAt).toLocaleDateString()}
        />

        {/* SAVE */}
        {editMode && (
          <button
            disabled={saving}
            onClick={saveProfile}
            className="w-full py-3 rounded-xl
            bg-gradient-to-r from-cyan-500 to-purple-500
            text-white font-semibold flex justify-center gap-2"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl
          bg-gradient-to-r from-red-500 to-pink-500
          text-white font-semibold flex justify-center gap-2"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
};

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-center gap-4 text-slate-300">
    <Icon size={18} className="text-cyan-400" />
    <div className="flex-1">
      <p className="text-xs text-slate-400">{label}</p>
      <div>{value}</div>
    </div>
  </div>
);

export default AdminProfile;
