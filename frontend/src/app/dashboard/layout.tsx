"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

type UserContext = {
  role: string;
  name: string;
  email: string;
  id?: number;
};

const allNavLinks = [
  // ── Admin links ──────────────────────────────────────────────────────────
  { href: "/dashboard/admin",       label: "Dashboard",        icon: "dashboard",       roles: ["admin"] },
  { href: "/dashboard/doctors",     label: "Doctors",          icon: "stethoscope",     roles: ["admin"] },
  { href: "/dashboard/patients",    label: "Patients",         icon: "personal_injury", roles: ["admin"] },
  { href: "/dashboard/appointments",label: "Appointments",     icon: "event_note",      roles: ["admin"] },
  { href: "/dashboard/financial",   label: "Financial",        icon: "payments",        roles: ["admin"] },
  { href: "/dashboard/settings",    label: "Settings",         icon: "settings",        roles: ["admin"] },
  // ── Doctor links ─────────────────────────────────────────────────────────
  { href: "/dashboard/doctor",      label: "Appointment Queue",icon: "event_note",      roles: ["doctor"] },
  { href: "/dashboard/settings",    label: "Settings",         icon: "settings",        roles: ["doctor"] },
  // ── Patient links ────────────────────────────────────────────────────────
  { href: "/dashboard/patient",     label: "My Appointments",  icon: "calendar_month",  roles: ["patient"] },
  { href: "/dashboard/settings",    label: "Settings",         icon: "settings",        roles: ["patient"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<UserContext | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hms_user");
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const filteredLinks = user
    ? allNavLinks.filter((link) => link.roles.includes(user.role))
    : [];

  const handleLogout = () => {
    localStorage.removeItem("hms_user");
    localStorage.removeItem("hms_user_id");
    router.push("/");
  };

  const roleLabel =
    user?.role === "admin"   ? "System Administrator" :
    user?.role === "doctor"  ? "Medical Staff"        :
    user?.role === "patient" ? "Patient"              : "User";

  return (
    <>
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface flex flex-col py-8 px-4 z-50 border-r border-outline-low">
        <div className="mb-12 px-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-2xl">local_hospital</span>
            <h1 className="text-2xl font-black tracking-tight text-primary font-headline">HMS</h1>
          </div>
          <p className="font-headline uppercase tracking-widest text-[10px] text-muted/60 mt-1 pl-1">
            Clinical Operations
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {filteredLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-primary font-bold bg-surface border-l-2 border-[#0ea5e9]"
                    : "text-muted/60 hover:text-subtle hover:bg-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                <span className="font-headline uppercase tracking-widest text-[11px]">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-low space-y-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center text-primary font-bold text-sm border border-[#0284c7]/20">
              {user?.name?.substring(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user?.name ?? "Loading..."}</p>
              <p className="text-[10px] text-muted/60 uppercase tracking-tighter">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full py-2 px-3 rounded-lg text-muted/60 hover:text-error hover:bg-error/5 transition-all text-xs uppercase tracking-widest font-bold"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-background/80 backdrop-blur-xl flex justify-between items-center px-8 z-40 border-b border-outline-low">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary/50 text-[18px]">local_hospital</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Hospital Management System</span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-outline-low">
            <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">System Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-subtle">{user?.name ?? "..."}</span>
            <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/20 border border-[#0284c7]/20 flex items-center justify-center text-primary font-bold text-xs">
              {user?.name?.substring(0, 2).toUpperCase() ?? "??"}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="ml-[240px] pt-24 px-8 pb-12 min-h-screen">
        {children}
      </main>
    </>
  );
}
