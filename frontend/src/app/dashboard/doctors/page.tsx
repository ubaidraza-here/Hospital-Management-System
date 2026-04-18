"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Doctor = {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  shift_status: string;
  active_appointments: number;
};

export default function DoctorsDirectoryPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/doctors")
      .then(({ data }) => setDoctors(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0ea5e9]" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-10">
        <p className="text-muted font-headline uppercase tracking-[0.3em] text-[10px] mb-2">Hospital Directory</p>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          Medical <span className="text-primary">Staff</span>
        </h1>
      </header>

      <div className="bg-surface rounded-2xl overflow-hidden border border-outline-low">
        <div className="p-5 border-b border-outline-low flex justify-between items-center">
          <h2 className="font-headline font-bold text-base flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#0ea5e9] rounded-full" />
            Registered Doctors
          </h2>
          <span className="text-xs text-muted">{doctors.length} Staff Member{doctors.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-muted text-[10px] uppercase font-bold tracking-widest border-b border-outline-low">
                <th className="p-4">Doctor</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Department</th>
                <th className="p-4">Shift Status</th>
                <th className="p-4 rounded-tr-xl text-right">Active Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {doctors.map((d) => (
                <tr key={d.id} className="hover:bg-surface/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/10 text-primary flex items-center justify-center font-bold text-sm border border-[#0284c7]/20">
                        {d.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-on-surface">{d.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-muted">{d.email}</p>
                    <p className="text-xs text-muted/60 mt-0.5">{d.phone}</p>
                  </td>
                  <td className="p-4 text-sm font-medium text-on-surface">{d.specialization}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      d.shift_status === 'on_shift' ? 'bg-[#5eead4]/10 text-secondary border border-[#047857]/20' :
                      d.shift_status === 'busy' ? 'bg-[#fcd34d]/10 text-warning border border-[#fcd34d]/20' :
                      'bg-surface-dim0/10 text-muted border border-slate-500/20'
                    }`}>
                      {d.shift_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <span className="font-black text-on-surface">{d.active_appointments}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {doctors.length === 0 && (
            <div className="py-12 text-center text-muted/60 text-sm">No doctors registered yet.</div>
          )}
        </div>
      </div>
    </>
  );
}
