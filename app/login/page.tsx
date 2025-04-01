'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { FiLogIn } from 'react-icons/fi'; // Google OAuth icon

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsLoggedIn(true);
      }
    };

    checkAuthStatus();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/generate`,
      },
    });

    if (error) {
      console.error('Error logging in:', error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className="text-5xl font-extrabold">Welcome Back!</h1>
        <p className="mt-4 text-lg">Sign in to get help with your assignments!</p>
      </motion.div>

      {isLoggedIn ? (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xl font-semibold">You're already logged in!</p>
          <motion.button
            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full shadow-lg"
            whileHover={{ scale: 1.05 }}
            onClick={() => router.push('/')}
          >
            Go to Home
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          className="text-center flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={signInWithGoogle}
            className="bg-white text-blue-500 px-6 py-3 rounded-full shadow-lg flex items-center gap-4 justify-center hover:bg-gray-100"
          >
            <FiLogIn size={24} /> <span>Sign in with Google</span>
          </button>
          <p className="mt-4 text-sm">
            By signing in, you agree to our <a href="#" className="text-blue-300">Terms of Service</a> and <a href="#" className="text-blue-300">Privacy Policy</a>.
          </p>
        </motion.div>
      )}
    </div>
  );
}
