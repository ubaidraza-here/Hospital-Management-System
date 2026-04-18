"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Patient = {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  blood_type: string | null;
};

export default function PatientsRegistryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/patients")
      .then(({ data }) => setPatients(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5eead4]" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-10">
        <p className="text-muted font-headline uppercase tracking-[0.3em] text-[10px] mb-2">Hospital Directory</p>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          Patient <span className="text-secondary">Registry</span>
        </h1>
      </header>

      <div className="bg-surface rounded-2xl overflow-hidden border border-outline-low">
        <div className="p-5 border-b border-outline-low flex justify-between items-center">
          <h2 className="font-headline font-bold text-base flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#5eead4] rounded-full" />
            Registered Patients
          </h2>
          <span className="text-xs text-muted">{patients.length} Patient{patients.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-muted text-[10px] uppercase font-bold tracking-widest border-b border-outline-low">
                <th className="p-4">Patient ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Blood Type</th>
                <th className="p-4 text-right">Date of Birth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                  <td className="p-4">
                    <span className="font-mono text-xs text-muted/60 bg-black/30 px-2 py-1 rounded">PT-{p.id.toString().padStart(4, '0')}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-sm text-on-surface">{p.name}</span>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-muted">{p.email}</p>
                    <p className="text-[11px] text-muted/60 mt-0.5">{p.phone}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-[10px] font-black rounded-lg text-error bg-[#ef4444]/10 border border-[#ef4444]/20 shadow-inner">
                      {p.blood_type || "N/A"}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm text-muted">
                    {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : "Undisclosed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {patients.length === 0 && (
            <div className="py-12 text-center text-muted/60 text-sm">No patients registered in the system.</div>
          )}
        </div>
      </div>
    </>
  );
}
