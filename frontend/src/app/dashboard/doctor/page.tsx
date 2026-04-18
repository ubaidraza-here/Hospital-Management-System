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
  status: string;
  date_time: string;
  consultation_notes: string | null;
  is_paid: boolean;
};

// ── Status badge helpers ──────────────────────────────────────────────────────

const apptBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "badge-pending", approved: "badge-approved",
    completed: "badge-completed", cancelled: "badge-cancelled",
  };
  return map[s] ?? "";
};

// ── Notes Modal ───────────────────────────────────────────────────────────────

function NotesModal({
  apptId,
  currentNotes,
  onClose,
  onSaved,
}: {
  apptId: number;
  currentNotes: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/appointments/${apptId}/status`, {
        status: "completed",
        consultation_notes: notes,
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-2xl w-full max-w-lg p-8 shadow-2xl">
        <h2 className="text-xl font-black text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">edit_note</span>
          Consultation Notes
        </h2>
        <p className="text-xs text-muted/60 mb-5">Record clinical observations. This will mark the appointment as Completed.</p>
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter consultation notes, diagnosis, follow-up actions…"
          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant/20 focus:ring-primary/50 rounded-xl p-4 text-sm text-on-surface outline-none resize-none transition-all"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-muted text-sm font-bold hover:bg-surface-container-low transition-all">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface text-on-surface text-sm font-black tracking-widest disabled:opacity-50">
            {saving ? "Saving…" : "Complete & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DoctorPortalPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState<"queue" | "patients">("queue");
  const [actionId, setActionId]         = useState<number | null>(null);
  const [shiftStatus, setShiftStatus]   = useState<string>("off_duty");
  const [notesModal, setNotesModal]     = useState<{ id: number; notes: string } | null>(null);

  const fetchData = useCallback(async () => {
    const doctorId = localStorage.getItem("hms_user_id");
    if (!doctorId) return;
    try {
      const [apptsRes, docRes] = await Promise.all([
        api.get(`/appointments/doctor/${doctorId}`),
        api.get(`/doctors/${doctorId}`)
      ]);
      setAppointments(apptsRes.data);
      setShiftStatus(docRes.data.shift_status);
    } catch (e) {
      console.error("Doctor portal fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: number, newStatus: string) => {
    setActionId(id);
    try {
      await api.patch(`/appointments/${id}/status`, { status: newStatus });
      router.refresh();
      await fetchData();
    } finally { setActionId(null); }
  };

  const updateShift = async (newShift: string) => {
    const doctorId = localStorage.getItem("hms_user_id");
    if (!doctorId) return;
    try {
      await api.patch(`/doctors/${doctorId}/shift`, { shift_status: newShift });
      setShiftStatus(newShift);
    } catch (e) { console.error(e); }
  };

  const pending   = appointments.filter((a) => a.status === "pending");
  const approved  = appointments.filter((a) => a.status === "approved");
  const queue     = [...pending, ...approved];
  const myPatients = appointments.filter(
    (a) => a.status === "completed" || a.status === "approved"
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
      {notesModal && (
        <NotesModal
          apptId={notesModal.id}
          currentNotes={notesModal.notes}
          onClose={() => setNotesModal(null)}
          onSaved={() => { setNotesModal(null); fetchData(); }}
        />
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <p className="text-muted font-headline uppercase tracking-[0.3em] text-[10px] mb-2">
            Doctor Portal
          </p>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
            Clinical <span className="text-primary">Workspace</span>
          </h1>
        </div>
        
        <div className="bg-surface border border-outline-low rounded-xl p-2 flex items-center gap-2">
          <span className="text-[10px] text-muted/60 font-bold uppercase tracking-widest pl-2 pr-1">Shift Status:</span>
          {([
            { val: "on_shift", label: "On Shift", color: "text-secondary bg-[#5eead4]/10 border-[#047857]/20" },
            { val: "busy",     label: "Busy",     color: "text-warning bg-[#fcd34d]/10 border-[#fcd34d]/20" },
            { val: "off_duty", label: "Off Duty", color: "text-muted bg-surface-dim0/10 border-slate-500/20" },
          ] as const).map(({ val, label, color }) => (
            <button
              key={val}
              onClick={() => updateShift(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                shiftStatus === val ? color : "border-transparent text-muted/60 hover:bg-surface-dim"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Pending",  value: pending.length,  color: "text-warning", bg: "bg-[#d97706]/10" },
          { label: "Approved", value: approved.length, color: "text-primary", bg: "bg-[#0ea5e9]/10" },
          { label: "Total",    value: appointments.length, color: "text-primary", bg: "bg-primary/10" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-outline-low p-5 rounded-2xl`}>
            <p className="text-muted/60 text-[10px] uppercase tracking-widest mb-1">{label} Appointments</p>
            <p className={`text-3xl font-headline font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-container-lowest rounded-xl p-1 w-fit">
        {([
          { key: "queue",    label: "Appointment Queue", icon: "queue" },
          { key: "patients", label: "My Patients",       icon: "group" },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted/60 hover:text-subtle"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Queue */}
      {tab === "queue" && (
        <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-low">
          <div className="p-5 border-b border-outline-low flex justify-between items-center">
            <h2 className="font-headline font-bold text-base flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#fcd34d] rounded-full" />
              Pending & Approved Appointments
            </h2>
            <span className="text-xs text-muted/60">{queue.length} record{queue.length !== 1 ? "s" : ""}</span>
          </div>
          {queue.length === 0 ? (
            <div className="py-16 text-center text-muted/60">
              <span className="material-symbols-outlined text-5xl block mb-3 opacity-20">event_available</span>
              <p className="text-sm">No pending appointments in your queue.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {queue.map((a) => (
                <div key={a.id} className="p-5 hover:bg-surface-container-high/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border border-primary/10">
                        {a.patient_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{a.patient_name}</p>
                        <p className="text-[11px] text-muted/60">
                          {new Date(a.date_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${apptBadge(a.status)}`}>
                        {a.status}
                      </span>
                      {a.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(a.id, "approved")}
                            disabled={actionId === a.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#0ea5e9]/15 hover:bg-[#0ea5e9]/25 text-primary border border-[#0284c7]/20 text-xs font-black rounded-lg uppercase tracking-wider transition-all disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(a.id, "cancelled")}
                            disabled={actionId === a.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error border border-error/20 text-xs font-black rounded-lg uppercase tracking-wider transition-all disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Reject
                          </button>
                        </>
                      )}
                      {a.status === "approved" && (
                        <button
                          onClick={() => setNotesModal({ id: a.id, notes: a.consultation_notes ?? "" })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#0d9488]/15 hover:bg-[#0d9488]/25 text-secondary border border-[#0d9488]/20 text-xs font-black rounded-lg uppercase tracking-wider transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Patients */}
      {tab === "patients" && (
        <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-low">
          <div className="p-5 border-b border-outline-low">
            <h2 className="font-headline font-bold text-base flex items-center gap-2">
              <span className="w-1.5 h-5 bg-secondary rounded-full" />
              My Patient History
            </h2>
          </div>
          {myPatients.length === 0 ? (
            <div className="py-16 text-center text-muted/60">
              <span className="material-symbols-outlined text-5xl block mb-3 opacity-20">group</span>
              <p className="text-sm">No patient history available yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {myPatients.map((a) => (
                <div key={a.id} className="p-5 hover:bg-surface-container-high/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-sm border border-secondary/10">
                        {a.patient_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{a.patient_name}</p>
                        <p className="text-[11px] text-muted/60">
                          {new Date(a.date_time).toLocaleDateString()}
                        </p>
                        {a.consultation_notes && (
                          <p className="text-[11px] text-muted mt-0.5 max-w-sm truncate">{a.consultation_notes}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${apptBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
