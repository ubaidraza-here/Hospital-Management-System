"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginGateway() {
  const [isLogin, setIsLogin]   = useState(true);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (isLogin && !password) || (!isLogin && (!name || !phone))) { 
      setError("Please fill all required fields."); 
      return; 
    }

    setLoading(true);
    setError("");
    
    try {
      if (isLogin) {
        const { data } = await api.post("/login", { email, password });
        finishAuth(data);
      } else {
        // Register new patient
        const { data } = await api.post("/patients", { name, email, phone, blood_type: bloodGroup });
        // Auto-login after registration (ensure role is set since POST /patients doesn't return role natively)
        finishAuth({ ...data, role: "patient" });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication failed. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  const finishAuth = (data: any) => {
    const { role, name, id, phone, email: returnedEmail } = data;

    // Persist full HMS user context for RBAC sidebar + Settings page
    localStorage.setItem("hms_user", JSON.stringify({ role, name, email: returnedEmail, phone, id }));
    localStorage.setItem("hms_user_id", String(id));

    // Strict role-based routing
    if (role === "admin")        router.push("/dashboard/admin");
    else if (role === "doctor")  router.push("/dashboard/doctor");
    else if (role === "patient") router.push("/dashboard/patient");
    else                         router.push("/dashboard/admin");
  };

  return (
    <div
      className="bg-background min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.06) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(20, 184, 166, 0.04) 0px, transparent 50%)
        `,
      }}
    >
      {/* Ambient glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#0ea5e9]/4 blur-[140px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#0d9488]/4 blur-[140px]" />
      </div>

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="relative w-full max-w-[480px] z-20">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0ea5e9]/10 border border-[#0284c7]/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">local_hospital</span>
          </div>
          <span className="font-headline text-4xl font-black tracking-tight text-primary">HMS</span>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-[1px] w-8 bg-[#253258]" />
            <span className="font-headline uppercase tracking-[0.25em] text-[10px] text-muted/60 font-semibold">
              Clinical Gateway
            </span>
            <div className="h-[1px] w-8 bg-[#253258]" />
          </div>
        </div>

        {/* Card */}
        <section className="glass-card rounded-2xl overflow-hidden shadow-card">
          {/* Tabs */}
          <div className="flex border-b border-outline-low">
            <button 
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${isLogin ? 'text-primary border-b-2 border-[#0ea5e9] bg-surface/50' : 'text-muted/60 hover:bg-surface/30'}`}
            >
              Staff / Existing
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${!isLogin ? 'text-secondary border-b-2 border-[#5eead4] bg-surface/50' : 'text-muted/60 hover:bg-surface/30'}`}
            >
              New Patient
            </button>
          </div>

          <div className="p-8 md:p-10">
            <header className="mb-8 text-center">
              <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">
                {isLogin ? "System Authentication" : "Patient Registration"}
              </h1>
              <p className="text-muted text-sm">
                {isLogin ? "Access the HMS clinical environment securely." : "Create your medical record and schedule appointments."}
              </p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {!isLogin && (
                <>
                  {/* Name field for Registration */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted ml-1">Full Legal Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/60 group-focus-within:text-secondary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-background border-none ring-1 ring-outline-low focus:ring-1 focus:ring-secondary overflow-hidden rounded-lg py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-muted transition-all outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Phone field for Registration */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted ml-1">Contact Phone</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/60 group-focus-within:text-secondary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">phone</span>
                        </div>
                        <input
                          type="tel"
                          placeholder="555-010-2345"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-background border-none ring-1 ring-outline-low focus:ring-1 focus:ring-secondary rounded-lg py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-muted transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* Blood Group */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted ml-1">Blood Group</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/60 group-focus-within:text-secondary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">bloodtype</span>
                        </div>
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full bg-background border-none ring-1 ring-outline-low focus:ring-1 focus:ring-secondary overflow-hidden rounded-lg py-3.5 pl-12 pr-4 text-sm text-on-surface transition-all outline-none appearance-none"
                        >
                          <option value="">Select...</option>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/60 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                  </div>
                  <input
                    type="email"
                    placeholder="name@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border-none ring-1 ring-outline focus:ring-1 focus:ring-primary rounded-lg py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-muted transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password (Only for Login) */}
              {isLogin && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted ml-1">
                    Access Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/60 group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border-none ring-1 ring-outline focus:ring-1 focus:ring-primary rounded-lg py-3.5 pl-12 pr-12 text-sm text-on-surface placeholder:text-muted transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-error text-[11px] font-medium ml-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-on-surface py-4 mt-2 rounded-xl font-headline font-extrabold text-sm uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${isLogin ? 'bg-gradient-to-r from-primary-dim to-[#10b981] shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-on-surface shadow-[0_8px_20px_rgba(28,146,210,0.3)] hover:shadow-[0_8px_30px_rgba(28,146,210,0.45)]' : 'cta-gradient'}`}
              >
                {loading ? (
                  <><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" /> processing</>
                ) : (
                  <>{isLogin ? 'Authenticate' : 'Register Securely'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
                )}
              </button>
            </form>

            {/* Footer */}
            <footer className="mt-8 pt-6 border-t border-outline-low text-center">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: "shield", label: "TLS 1.3" },
                  { icon: "verified_user", label: "HIPAA Safe" },
                  { icon: "lock", label: "Encrypted" },
                ].map(({ icon, label }) => (
                  <div key={label} className="bg-surface rounded-lg p-2 flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-primary/60 text-[16px]">{icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted">{label}</span>
                  </div>
                ))}
              </div>
            </footer>
          </div>
        </section>

        {isLogin && (
          <div className="mt-6 bg-surface/60 border border-outline rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60 mb-2">Demo Credentials</p>
            <p className="text-[11px] text-muted"><span className="text-primary font-bold">Admin:</span> admin@hospital.org</p>
            <p className="text-[11px] text-muted"><span className="text-secondary font-bold">Doctor:</span> doctor@hospital.org</p>
            <p className="text-[11px] text-muted"><span className="text-warning font-bold">Patient:</span> patient@hospital.org</p>
          </div>
        )}
      </main>

      {/* Side medical image */}
      <div className="fixed right-0 top-0 bottom-0 w-1/3 hidden lg:block overflow-hidden z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-l from-[#f4f7f6] via-background/60 to-transparent z-10" />
        <img
          alt="Hospital clinical environment"
          className="w-full h-full object-cover grayscale brightness-[0.25] contrast-125 saturate-50"
          src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80"
        />
      </div>
    </div>
  );
}
