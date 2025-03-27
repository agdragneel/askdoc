"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js"; // Import User type

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null); // Fixed typing
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        router.push("/login"); // Redirect to login if not signed in
      } else {
        setUser(data.user); // Now this works correctly
      }
      setLoading(false);
    };

    checkUser();
  }, [router]); // Added router as a dependency

  if (loading) return <p>Loading...</p>; // Show a loader while checking auth

  return <>{children}</>; // Render page if authenticated
}
