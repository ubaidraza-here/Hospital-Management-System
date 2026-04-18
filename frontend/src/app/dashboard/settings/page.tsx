"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function SettingsPage() {
  const [form, setForm]     = useState({ name: "", email: "", phone: "" });
  const [userId, setUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [err, setErr]       = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("hms_user");
    const id     = localStorage.getItem("hms_user_id");
    if (stored) { const u = JSON.parse(stored); setForm({ name: u.name, email: u.email, phone: u.phone ?? "" }); }
    if (id) setUserId(Number(id));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true); setMsg(""); setErr("");
    try {
      const { data } = await api.put(`/users/${userId}`, form);
      const hmsUser = JSON.parse(localStorage.getItem("hms_user") ?? "{}");
      localStorage.setItem("hms_user", JSON.stringify({ ...hmsUser, ...data }));
      setMsg("Profile updated successfully.");
    } catch (ex: unknown) {
      const d = ex && typeof ex === "object" && "response" in ex
        ? (ex as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : "Update failed.";
      setErr(d ?? "Update failed.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <header className="mb-10">
        <p className="text-on-surface-variant font-headline uppercase tracking-[0.3em] text-[10px] mb-2">Settings</p>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          Account <span className="text-primary">Profile</span>
        </h1>
      </header>

      <div className="max-w-lg bg-surface-container-low border border-outline-low rounded-2xl p-8">
        <form onSubmit={save} className="space-y-5">
          {[
            { id: "name",  label: "Full Name", type: "text" },
            { id: "email", label: "Email",     type: "email" },
            { id: "phone", label: "Phone",     type: "tel" },
          ].map(({ id, label, type }) => (
            <div key={id}>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">{label}</label>
              <input
                type={type}
                value={form[id as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                className="w-full bg-surface-container-lowest ring-1 ring-outline-variant/20 focus:ring-primary/50 rounded-xl py-3.5 px-4 text-sm text-on-surface outline-none transition-all"
                required
              />
            </div>
          ))}
          {msg && <p className="text-secondary text-xs font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span>{msg}</p>}
          {err && <p className="text-error text-xs font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{err}</p>}
          <button type="submit" disabled={saving} className="w-full py-3.5 bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface text-on-surface font-black text-sm rounded-xl uppercase tracking-widest disabled:opacity-50 transition-all">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </>
  );
}
