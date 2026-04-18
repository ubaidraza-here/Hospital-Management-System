"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Appointment = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_specialization: string;
  status: string;
  date_time: string;
  consultation_notes: string | null;
  is_paid: boolean;
};

type Doctor = {
  id: number;
  name: string;
  email: string;
  specialization: string;
  shift_status: string;
  experience_years?: number;
  bio?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const apptBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "badge-pending", approved: "badge-approved",
    completed: "badge-completed", cancelled: "badge-cancelled",
  };
  return map[s] ?? "";
};

// ── Request Appointment Modal ─────────────────────────────────────────────────

function RequestModal({
  patientId,
  onClose,
  onBooked,
  preselectedDoctor,
}: {
  patientId: number;
  onClose: () => void;
  onBooked: () => void;
  preselectedDoctor?: Doctor;
}) {
  const [specializations, setSpecs]     = useState<string[]>([]);
  const [doctors, setDoctors]           = useState<Doctor[]>([]);
  const [selectedSpec, setSpec]         = useState(preselectedDoctor?.specialization ?? "");
  const [selectedDoctor, setDoctor]     = useState<number | "">(preselectedDoctor?.id ?? "");
  const [dateTime, setDateTime]         = useState("");
  const [saving, setSaving]             = useState(false);
  const [err, setErr]                   = useState("");
  const [availDoctors, setAvailDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    api.get("/specializations").then(({ data }) => setSpecs(data));
    api.get("/doctors").then(({ data }) => setDoctors(data));
  }, []);

  useEffect(() => {
    if (!selectedSpec) { setAvailDoctors([]); return; }
    // allow preselected doctor even if not formally "on_shift" during development override, but strict filter generally applies
    const filtered = doctors.filter(
      (d) => d.specialization === selectedSpec && d.shift_status === "on_shift"
    );
    // If we preselected someone who isn't on shift, still append them to avoid breaking
    if (preselectedDoctor && !filtered.find(d => d.id === preselectedDoctor.id)) {
        filtered.push(preselectedDoctor);
    }
    setAvailDoctors(filtered);
    if (!preselectedDoctor) setDoctor("");
  }, [selectedSpec, doctors, preselectedDoctor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !dateTime) { setErr("Please select a doctor and date/time."); return; }
    setSaving(true);
    setErr("");
    try {
      await api.post("/appointments", {
        patient_id: patientId,
        doctor_id: Number(selectedDoctor),
        date_time: dateTime,
      });
      onBooked();
    } catch (ex: unknown) {
      const msg = ex && typeof ex === "object" && "response" in ex
        ? (ex as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : "Booking failed.";
      setErr(msg ?? "Booking failed.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-2xl w-full max-w-lg p-8 shadow-2xl">
        <h2 className="text-xl font-black text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">event_available</span>
          Request Appointment
        </h2>
        <p className="text-xs text-muted mb-6">Only doctors who are currently <span className="text-secondary font-bold">On Shift</span> are available for booking.</p>

        <form onSubmit={submit} className="space-y-5">
          {/* Specialization */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
              Department / Specialization
            </label>
            <select
              value={selectedSpec}
              onChange={(e) => setSpec(e.target.value)}
              className="w-full bg-background ring-1 ring-outline focus:ring-primary rounded-xl py-3.5 px-4 text-sm text-on-surface outline-none transition-all appearance-none"
              required
            >
              <option value="">Select a department…</option>
              {specializations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Doctor — filtered to ON_SHIFT only */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
              Available Doctor
            </label>
            {selectedSpec && availDoctors.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-[#d97706]/10 border border-[#d97706]/20 rounded-xl">
                <span className="material-symbols-outlined text-warning text-[16px]">warning</span>
                <p className="text-warning text-xs font-bold">No doctors are currently On Shift for {selectedSpec}. Please try another department or check back later.</p>
              </div>
            ) : (
              <select
                value={selectedDoctor}
                onChange={(e) => setDoctor(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-background ring-1 ring-outline focus:ring-primary rounded-xl py-3.5 px-4 text-sm text-on-surface outline-none transition-all appearance-none disabled:opacity-40"
                required
                disabled={!selectedSpec || availDoctors.length === 0}
              >
                <option value="">Select a doctor…</option>
                {availDoctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
              Preferred Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full bg-background ring-1 ring-outline focus:ring-primary rounded-xl py-3.5 px-4 text-sm text-on-surface outline-none transition-all"
              required
            />
          </div>

          {err && (
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-xl">
              <span className="material-symbols-outlined text-error text-[16px]">error</span>
              <p className="text-error text-xs font-bold">{err}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-outline text-muted text-sm font-bold hover:bg-surface transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || (!!selectedSpec && availDoctors.length === 0)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface text-on-surface text-sm font-black tracking-widest disabled:opacity-40 transition-all shadow-[0_8px_20px_rgba(28,146,210,0.3)]">
              {saving ? "Booking…" : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Doctor Insight Modal ──────────────────────────────────────────────────────

function DoctorModal({ doc, onClose, onBook }: { doc: Doctor, onClose: () => void, onBook: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-outline rounded-3xl w-full max-w-md overflow-hidden shadow-card transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="h-32 bg-gradient-to-br from-primary-dim to-background p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-on-surface/70 hover:text-on-surface bg-surface/80 p-1.5 rounded-full backdrop-blur-md transition-all">
            <span className="material-symbols-outlined block text-[20px]">close</span>
          </button>
        </div>
        
        <div className="px-8 pb-8 -mt-16 relative z-10">
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-[#f4f7f6] shadow-xl flex items-center justify-center text-primary font-black text-3xl mb-4">
            {doc.name.substring(0, 2).toUpperCase()}
          </div>
          
          <h2 className="text-2xl font-black text-on-surface">{doc.name}</h2>
          <p className="text-secondary font-bold text-sm tracking-widest uppercase mb-6">{doc.specialization}</p>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-outline-low">
            <div>
              <p className="text-[10px] text-muted/60 uppercase tracking-widest font-bold mb-1">Clinical Exp.</p>
              <p className="text-lg font-black text-on-surface flex items-center gap-1">
                {doc.experience_years ?? 0} <span className="text-sm font-bold text-muted/60">Yrs</span>
              </p>
            </div>
            <div className="w-[1px] h-10 bg-surface-dim" />
            <div>
              <p className="text-[10px] text-muted/60 uppercase tracking-widest font-bold mb-1">Status</p>
              <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider border ${
                doc.shift_status === 'on_shift' ? 'bg-[#5eead4]/10 text-secondary border-[#047857]/20' :
                doc.shift_status === 'busy' ? 'bg-[#fcd34d]/10 text-warning border-[#fcd34d]/20' :
                'bg-surface-dim0/10 text-muted border-slate-500/20'
              }`}>
                {doc.shift_status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-3">Professional Biography</p>
            <p className="text-sm text-subtle leading-relaxed mb-8">
              {doc.bio || "This medical professional has dedicated their career to clinical excellence, prioritizing patient care and advanced diagnostic practices."}
            </p>
          </div>

          <button onClick={onBook} className="w-full py-4 rounded-xl font-headline font-black text-sm uppercase tracking-widest text-[#f4f7f6] bg-surface hover:bg-[#7dd3fc] transition-all flex justify-center items-center gap-2">
            Schedule Appointment <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientPortalPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorsList, setDoctorsList]   = useState<Doctor[]>([]);
  const [loading, setLoading]           = useState(true);
  
  const [tab, setTab]                   = useState<"appointments"|"doctors">("appointments");
  const [showApptModal, setShowApptModal] = useState(false);
  const [focusedDoctor, setFocusedDoctor] = useState<Doctor | null>(null);
  
  const [patientId, setPatientId]       = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const idStr = localStorage.getItem("hms_user_id");
    if (!idStr) return;
    const id = Number(idStr);
    setPatientId(id);
    try {
      const [apptsRes, docsRes] = await Promise.all([
        api.get(`/appointments/patient/${id}`),
        api.get(`/doctors`)
      ]);
      setAppointments(apptsRes.data);
      setDoctorsList(docsRes.data);
    } catch (e) {
      console.error("Patient portal fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initiateBooking = (doc?: Doctor) => {
    setFocusedDoctor(null);
    setTab("appointments");
    setShowApptModal(true);
  };

  const pending   = appointments.filter((a) => a.status === "pending").length;
  const approved  = appointments.filter((a) => a.status === "approved").length;
  const completed = appointments.filter((a) => a.status === "completed").length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0ea5e9]" />
      </div>
    );
  }

  return (
    <>
      {showApptModal && patientId && (
        <RequestModal
          patientId={patientId}
          onClose={() => setShowApptModal(false)}
          onBooked={() => {
            setShowApptModal(false);
            router.refresh();
            fetchData();
          }}
          // if we opened modal directly from a focused doctor
        />
      )}

      {focusedDoctor && (
        <DoctorModal 
          doc={focusedDoctor} 
          onClose={() => setFocusedDoctor(null)}
          onBook={() => initiateBooking(focusedDoctor)}
        />
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-muted font-headline uppercase tracking-[0.3em] text-[10px] mb-2">
            Patient Portal
          </p>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
            My <span className="text-primary">Dashboard</span>
          </h1>
        </div>
        <button
          onClick={() => initiateBooking()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface text-on-surface text-sm font-black rounded-xl uppercase tracking-widest shadow-[0_4px_20px_rgba(28,146,210,0.3)] hover:shadow-[0_4px_30px_rgba(28,146,210,0.45)] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Book Evaluation
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface rounded-xl p-1 w-fit border border-outline-low shadow-lg">
        {([
          { key: "appointments", label: "My Records & Schedule", icon: "content_paste" },
          { key: "doctors",      label: "Hospital Doctors",      icon: "diversity_3" },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              tab === key
                ? "bg-[#0ea5e9]/10 text-primary border border-[#0284c7]/20"
                : "text-muted/60 hover:text-subtle"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "appointments" && (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Pending",   value: pending,   color: "text-warning", bg: "bg-[#d97706]/10" },
              { label: "Approved",  value: approved,  color: "text-primary", bg: "bg-[#0ea5e9]/10" },
              { label: "Completed", value: completed, color: "text-secondary", bg: "bg-[#0d9488]/10" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} border border-outline-low p-5 rounded-2xl`}>
                <p className="text-muted text-[10px] uppercase tracking-widest font-bold mb-1">{label}</p>
                <p className={`text-3xl font-headline font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface rounded-2xl overflow-hidden border border-outline-low shadow-2xl">
            <div className="p-5 border-b border-outline-low flex justify-between items-center">
              <h2 className="font-headline font-bold text-base flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#0ea5e9] rounded-full" />
                Appointment History
              </h2>
              <span className="text-xs text-muted/60">{appointments.length} total</span>
            </div>

            {appointments.length === 0 ? (
              <div className="py-20 text-center text-muted/60">
                <span className="material-symbols-outlined text-6xl block mb-4 opacity-20">event_note</span>
                <p className="text-sm font-semibold mb-1">No appointments yet</p>
                <p className="text-xs text-muted">Click "Book Evaluation" to schedule your first consultation.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {appointments.map((a) => (
                  <div key={a.id} className="p-5 hover:bg-surface/50 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-surface-dim border border-outline flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-[20px]">stethoscope</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface mb-0.5">{a.doctor_name}</p>
                          <p className="text-[11px] text-secondary font-bold uppercase tracking-widest mb-1">{a.doctor_specialization}</p>
                          <p className="text-xs text-muted font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {new Date(a.date_time).toLocaleString()}
                          </p>
                          {a.consultation_notes && (
                            <div className="mt-3 bg-background rounded-lg p-3 border border-outline-low max-w-lg">
                              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Physician Notes</p>
                              <p className="text-xs text-subtle leading-relaxed">{a.consultation_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${apptBadge(a.status)}`}>
                          {a.status}
                        </span>
                        {a.is_paid && (
                          <span className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-widest mt-1">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                            Invoiced
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "doctors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctorsList.map(doc => (
            <div 
              key={doc.id} 
              onClick={() => setFocusedDoctor(doc)}
              className="bg-surface border border-outline-low rounded-2xl p-6 shadow-xl cursor-pointer hover:border-[#0284c7]/30 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/40 transition-all group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-surface border-2 border-outline-low flex items-center justify-center text-primary font-black text-xl group-hover:border-[#0ea5e9] transition-all">
                  {doc.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg leading-tight">{doc.name}</h3>
                  <p className="text-secondary text-[11px] font-bold uppercase tracking-widest mt-1">{doc.specialization}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-outline-low">
                <span className="text-xs text-muted font-bold">
                  {doc.experience_years ?? 0} Yrs Exp.
                </span>
                <span className={`px-2 py-1 text-[9px] font-black uppercase rounded text-center tracking-wider border ${
                  doc.shift_status === 'on_shift' ? 'bg-[#5eead4]/10 text-secondary border-[#047857]/20' :
                  doc.shift_status === 'busy' ? 'bg-[#fcd34d]/10 text-warning border-[#fcd34d]/20' :
                  'bg-surface-dim0/10 text-muted border-slate-500/20'
                }`}>
                  {doc.shift_status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
