"use client";
import { supabase } from "@/lib/supabaseClient";


export default function Login() {
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) console.error("Error logging in:", error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome to AI Assignment Agent
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Let AI assist you with your assignments. Sign in to get started.
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-2 mt-6 w-full px-4 py-2 border-2 border-blue-500 text-blue-500 bg-white hover:bg-blue-100 rounded-full shadow-md transition"
        >
          
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
