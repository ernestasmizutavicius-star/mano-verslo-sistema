"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabase() {
  useEffect(() => {
    console.log("Supabase objektas:", supabase);

    const checkSession = async () => {
      try {
        if (!supabase) {
          console.warn("Supabase klientas nerastas (null)");
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Supabase getSession klaida:", error);
          return;
        }

        console.log("Supabase session:", data?.session || null);
      } catch (err) {
        console.error("Supabase getSession klaida:", err);
      }
    };

    void checkSession();
  }, []);

  return null;
}
