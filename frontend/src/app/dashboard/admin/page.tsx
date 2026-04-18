"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stats = {
  doctors_on_shift: number;
  doctors_busy: number;
  appointments_today: number;
  pending_appointments: number;
  total_doctors: number;
  total_patients: number;
};

type Doctor = {
  id: number;
  name: string;
  specialization: string;
  shift_status: string;
  email: string;
  active_appointments: number;
};

type Appointment = {
  id: number;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  status: string;
  date_time: string;
  is_paid: boolean;
  invoice_amount: number | null;
};

type FinanceData = { month: string; revenue: number };

// ── Status badge helpers ──────────────────────────────────────────────────────

const shiftBadge = (s: string) => {
  if (s === "on_shift") return "badge-on-shift";
  if (s === "busy")     return "badge-busy";
  return "badge-off-duty";
};
const shiftLabel = (s: string) => {
  if (s === "on_shift") return "On Shift";
  if (s === "busy")     return "Busy";
  return "Off Duty";
};
const apptBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "badge-pending", approved: "badge-approved",
    completed: "badge-completed", cancelled: "badge-cancelled",
  };
  return map[s] ?? "";
};

// ── Add Doctor Modal ──────────────────────────────────────────────────────────

function AddDoctorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", specialization: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/doctors", form);
      onCreated();
    } catch (ex: unknown) {
      const msg = ex && typeof ex === "object" && "response" in ex
        ? (ex as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : "Failed to create doctor.";
      setErr(msg ?? "Failed to create doctor.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <h2 className="text-xl font-black text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person_add</span>
          Register New Doctor
        </h2>
        <form onSubmit={submit} className="space-y-4">
          {[
            { id: "name", label: "Full Name", type: "text", placeholder: "Dr. First Last" },
            { id: "email", label: "Email", type: "email", placeholder: "doctor@hospital.org" },
            { id: "phone", label: "Phone", type: "tel", placeholder: "+1 555 000 0000" },
            { id: "specialization", label: "Specialization", type: "text", placeholder: "Cardiology" },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id}>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[id as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                className="w-full bg-surface-container-lowest ring-1 ring-outline-variant/20 focus:ring-primary/50 rounded-lg py-3 px-4 text-sm text-on-surface outline-none transition-all"
                required
              />
            </div>
          ))}
          {err && <p className="text-error text-xs">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-muted text-sm font-bold hover:bg-surface-container-low transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface text-on-surface text-sm font-black tracking-widest disabled:opacity-50 transition-all">
              {saving ? "Saving..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats]       = useState<Stats | null>(null);
  const [doctors, setDoctors]   = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [finance, setFinance]   = useState<FinanceData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [payingId, setPayingId]  = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, d, a, f] = await Promise.all([
        api.get("/dashboard-stats"),
        api.get("/doctors"),
        api.get("/appointments"),
        api.get("/finances/history"),
      ]);
      setStats(s.data);
      setDoctors(d.data);
      setAppointments(a.data);
      setFinance(f.data);
    } catch (e) {
      console.error("Admin dashboard fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogPayment = async (apptId: number) => {
    setPayingId(apptId);
    try {
      await api.post(`/appointments/${apptId}/invoice`);
      router.refresh();
      await fetchAll();
    } catch (e) {
      console.error("Payment failed:", e);
    } finally {
      setPayingId(null); }
  };

  const handleDeleteDoctor = async (id: number) => {
    if (!confirm("Remove this doctor from the system?")) return;
    await api.delete(`/doctors/${id}`);
    await fetchAll();
  };

  const approvedUnpaid = appointments.filter(
    (a) => a.status === "approved" && !a.is_paid
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <AddDoctorModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchAll(); }}
        />
      )}

      {/* Header */}
      <header className="mb-10">
        <p className="text-on-surface-variant font-headline uppercase tracking-[0.3em] text-[10px] mb-2">
          Admin Control Center
        </p>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          Clinical <span className="text-primary">Operations</span> Dashboard
        </h1>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {[
          { label: "Doctors On Shift", value: stats?.doctors_on_shift, icon: "stethoscope", color: "text-secondary", bg: "bg-[#0d9488]/10" },
          { label: "Doctors Busy",     value: stats?.doctors_busy,     icon: "schedule",    color: "text-warning", bg: "bg-[#d97706]/10" },
          { label: "Appts Today",      value: stats?.appointments_today,icon: "today",      color: "text-primary", bg: "bg-[#0ea5e9]/10" },
          { label: "Pending Queue",    value: stats?.pending_appointments, icon: "pending", color: "text-[#fca5a5]", bg: "bg-[#ef4444]/10" },
          { label: "Total Doctors",    value: stats?.total_doctors,    icon: "badge",       color: "text-primary",   bg: "bg-primary/10"  },
          { label: "Total Patients",   value: stats?.total_patients,   icon: "personal_injury", color: "text-secondary", bg: "bg-secondary/10" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className={`${bg} border border-outline-low p-5 rounded-2xl hover:border-primary/10 transition-all`}>
            <span className={`material-symbols-outlined ${color} text-2xl mb-3 block`}>{icon}</span>
            <p className="text-muted/60 text-[10px] uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-headline font-black ${color}`}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Doctors Shift Status Table */}
        <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-low">
          <div className="p-6 border-b border-outline-low flex justify-between items-center">
            <h2 className="font-headline font-bold text-lg flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Doctor Shift Registry
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface text-on-surface text-xs font-black rounded-lg tracking-widest uppercase"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Doctor
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {doctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-surface-container-high/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                    {doc.name.split(" ").slice(-1)[0]?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{doc.name}</p>
                    <p className="text-[11px] text-muted/60">{doc.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${shiftBadge(doc.shift_status)}`}>
                    {shiftLabel(doc.shift_status)}
                  </span>
                  <button
                    onClick={() => handleDeleteDoctor(doc.id)}
                    className="text-muted hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
            {doctors.length === 0 && (
              <p className="text-center text-muted/60 text-sm py-8">No doctors registered.</p>
            )}
          </div>
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-low">
          <div className="p-6 border-b border-outline-low">
            <h2 className="font-headline font-bold text-lg flex items-center gap-2">
              <span className="w-1.5 h-6 bg-secondary rounded-full" />
              Monthly Revenue (Invoice Ledger)
            </h2>
          </div>
          <div className="p-6">
            {finance.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={finance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8fa3c8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#8fa3c8" }} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid rgba(125,211,252,0.1)", borderRadius: 8 }}
                    formatter={(v: any) => [`$${Number(v || 0).toFixed(2)}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-muted/60">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">bar_chart</span>
                <p className="text-sm">No invoice data available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Payment — Approved Unpaid Appointments */}
      <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-low mb-8">
        <div className="p-6 border-b border-outline-low flex justify-between items-center">
          <h2 className="font-headline font-bold text-lg flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#fcd34d] rounded-full" />
            Billing Queue — Approved Appointments
          </h2>
          <span className="text-xs text-muted/60">{approvedUnpaid.length} awaiting payment</span>
        </div>
        {approvedUnpaid.length === 0 ? (
          <div className="py-12 text-center text-muted/60">
            <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">receipt_long</span>
            <p className="text-sm">All approved appointments have been invoiced.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {approvedUnpaid.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 hover:bg-surface-container-high/50 transition-all">
                <div>
                  <p className="text-sm font-bold text-on-surface">{a.patient_name}</p>
                  <p className="text-[11px] text-muted/60">
                    {a.doctor_name} · {a.doctor_specialization} · {new Date(a.date_time).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleLogPayment(a.id)}
                  disabled={payingId === a.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0d9488]/20 hover:bg-[#0d9488]/30 text-secondary border border-[#0d9488]/30 text-xs font-black rounded-lg uppercase tracking-widest transition-all disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  {payingId === a.id ? "Processing..." : "Log Payment · $150"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Appointments Table */}
      <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-low">
        <div className="p-6 border-b border-outline-low">
          <h2 className="font-headline font-bold text-lg flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary/70 rounded-full" />
            All Appointments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-highest/40">
                {["Patient", "Doctor", "Specialization", "Date & Time", "Status", "Invoice"].map((h) => (
                  <th key={h} className="py-3 px-5 text-[10px] uppercase tracking-[0.2em] text-muted font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {appointments.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted/60">No appointments found.</td></tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-container-highest/30 transition-colors">
                    <td className="py-3.5 px-5 text-sm font-semibold text-on-surface">{a.patient_name}</td>
                    <td className="py-3.5 px-5 text-sm text-on-surface">{a.doctor_name}</td>
                    <td className="py-3.5 px-5 text-xs text-muted">{a.doctor_specialization}</td>
                    <td className="py-3.5 px-5 text-xs text-muted">{new Date(a.date_time).toLocaleString()}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${apptBadge(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      {a.is_paid ? (
                        <span className="text-secondary text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          ${a.invoice_amount?.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
