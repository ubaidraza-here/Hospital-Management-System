"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Appointment = {
  id: number;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  status: string;
  date_time: string;
  is_paid: boolean;
};

const badgeColor = (status: string) => {
  switch (status) {
    case "pending":  return "bg-[#fcd34d]/10 text-warning border-[#fcd34d]/20";
    case "approved": return "bg-[#0ea5e9]/10 text-primary border-[#0284c7]/20";
    case "completed":return "bg-[#5eead4]/10 text-secondary border-[#047857]/20";
    case "cancelled":return "bg-[#ef4444]/10 text-error border-[#ef4444]/20";
    default:         return "bg-surface-dim0/10 text-muted border-slate-500/20";
  }
};

export default function GlobalAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/appointments")
      .then(({ data }) => setAppointments(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7dd3fc]" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-10">
        <p className="text-muted font-headline uppercase tracking-[0.3em] text-[10px] mb-2">Hospital Directory</p>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          Global <span className="text-primary">Appointments</span>
        </h1>
      </header>

      <div className="bg-surface rounded-2xl overflow-hidden border border-outline-low shadow-2xl">
        <div className="p-5 border-b border-outline-low flex justify-between items-center">
          <h2 className="font-headline font-bold text-base flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#7dd3fc] rounded-full" />
            Scheduling Queue
          </h2>
          <span className="text-xs text-muted">{appointments.length} Total Record{appointments.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-muted text-[10px] uppercase font-bold tracking-widest border-b border-outline-low">
                <th className="p-4">Reference</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Doctor (Dept)</th>
                <th className="p-4 text-center">Date & Time</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                  <td className="p-4">
                    <span className="font-mono text-xs text-muted/60">#{a.id.toString().padStart(6, '0')}</span>
                  </td>
                  <td className="p-4 font-bold text-sm text-on-surface">{a.patient_name}</td>
                  <td className="p-4">
                    <p className="font-bold text-sm text-on-surface">{a.doctor_name}</p>
                    <p className="text-[11px] text-muted">{a.doctor_specialization}</p>
                  </td>
                  <td className="p-4 text-center text-sm font-medium text-muted">
                    {new Date(a.date_time).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 text-[10px] uppercase font-black rounded-lg border ${badgeColor(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {a.is_paid ? (
                      <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-muted text-lg">pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {appointments.length === 0 && (
            <div className="py-12 text-center text-muted/60 text-sm">No appointments found.</div>
          )}
        </div>
      </div>
    </>
  );
}
