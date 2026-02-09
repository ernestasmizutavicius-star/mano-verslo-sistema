"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Supabase objektas:", supabase);
      const {
        data: signInData,
        error: signInError
      } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("Neteisingas el. paštas arba slaptažodis");
        setLoading(false);
        return;
      }

      const user = signInData.user;
      if (!user) {
        setError("Vartotojas nerastas");
        setLoading(false);
        return;
      }

      // Fetch profile from 'customers' table by user id (UUID)
      const { data: profiles, error: profileError } = await supabase
        .from("customers")
        .select("client_name, discount_group, manager_email")
        .eq("id", user.id);

      console.log('🔍 User ID:', user.id);
      console.log('🔍 Profiles result:', profiles);
      console.log('🔍 Profile error:', profileError);

      if (profileError) {
        console.warn("Klaida gaunant profile:", profileError.message);
      }

      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
      console.log('🔍 Selected profile:', profile);

      const clientName = profile?.client_name || null;
      const discountGroup = profile?.discount_group || null;
      const managerEmail = profile?.manager_email || null;

      // Decide a clientCode to integrate with existing app. Prefer discount_group, then client_name
      const clientCode = discountGroup || clientName || "";

      // Save login state and profile info to localStorage so main app restores state
      try {
        localStorage.setItem("isLoggedIn", "true");
        if (clientCode) localStorage.setItem("clientCode", clientCode);
        if (clientName) localStorage.setItem("client_name", clientName);
        if (discountGroup) localStorage.setItem("discount_group", discountGroup);
        if (managerEmail) localStorage.setItem("manager_email", managerEmail);
      } catch (e) {
        console.warn("localStorage write failed", e);
      }

      // Redirect to homepage (main app will pick up localStorage and set state)
      router.push("/");
    } catch (e: any) {
      setError(e?.message || "Klaida");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Prisijungimas</h1>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">El. paštas</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slaptažodis</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border px-3 py-2 rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94" />
                    <path d="M1 1l22 22" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    <path d="M14.12 14.12 9.88 9.88" />
                    <path d="M7.12 7.12A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.68 21.68 0 0 1-4.87 6.06" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-[#c29a74] text-white px-4 py-2 rounded font-semibold hover:opacity-95"
              disabled={loading}
            >
              {loading ? "Prisijungiama..." : "Prisijungti"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
