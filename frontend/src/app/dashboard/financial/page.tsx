"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "@/lib/api";

type HistoryData = {
  month: string;
  revenue: number;
};

export default function FinancialLedgerPage() {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/finances/history")
      .then(({ data }) => setHistory(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = history.reduce((sum, item) => sum + Number(item.revenue), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-10">
        <p className="text-muted font-headline uppercase tracking-[0.3em] text-[10px] mb-2">Hospital Administration</p>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          Financial <span className="text-primary">Ledger</span>
        </h1>
      </header>

      {/* Overview Stat */}
      <div className="bg-gradient-to-r from-[#10b981]/20 to-transparent border border-primary/20 rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-primary font-bold text-xs uppercase tracking-widest mb-1">Total Recorded Revenue</p>
          <p className="text-4xl font-black text-on-surface">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <span className="material-symbols-outlined text-6xl text-primary/30">account_balance</span>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-low p-6 md:p-8">
        <h2 className="font-headline font-bold text-base flex items-center gap-2 mb-6">
          <span className="w-1.5 h-5 bg-[#10b981] rounded-full" />
          Revenue Trajectory (6 Months)
        </h2>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f6d" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8fa3c8" }} axisLine={{ stroke: '#2a3f6d' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#8fa3c8" }} tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#162040' }}
                contentStyle={{ background: "#f4f7f6", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                formatter={(v: any) => [`$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue"]}
                labelStyle={{ color: '#8fa3c8', fontWeight: 'bold', marginBottom: '8px' }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
