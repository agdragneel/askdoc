"use client";
import { supabase } from "@/lib/supabaseClient";

export default function Auth() {
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) console.error("Error logging in:", error.message);
  };

  return (
    <button onClick={signInWithGoogle} className="px-4 py-2 bg-blue-500 text-white rounded">
      Sign in with Google
    </button>
  );
}
