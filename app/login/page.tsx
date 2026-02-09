"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TestSupabase from "@/components/TestSupabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      // Fetch profile from 'profiles' table by user id (UUID)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("client_name, discount_group")
        .eq("id", user.id)
        .single();

      if (profileError) {
        // Not fatal — still proceed but notify
        console.warn("Klaida gaunant profile:", profileError.message);
      }

      const clientName = profile?.client_name || null;
      const discountGroup = profile?.discount_group || null;

      // Decide a clientCode to integrate with existing app. Prefer discount_group, then client_name
      const clientCode = discountGroup || clientName || "";

      // Save login state and profile info to localStorage so main app restores state
      try {
        localStorage.setItem("isLoggedIn", "true");
        if (clientCode) localStorage.setItem("clientCode", clientCode);
        if (clientName) localStorage.setItem("profile_client_name", clientName);
        if (discountGroup) localStorage.setItem("profile_discount_group", discountGroup);
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
      <TestSupabase />
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
            />
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
