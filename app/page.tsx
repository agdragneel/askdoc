'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { FiLogIn } from 'react-icons/fi';


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
    <div className="flex min-h-screen bg-black text-gray-900">
      {/* Left Section (40%) */}
      <div className="w-full md:w-2/5 bg-white flex flex-col items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-black">
            Let AI Agents <span className="text-blue-600">Do The Magic</span>
          </h1>
          <p className="text-lg mb-8 text-gray-700">
            Get instant help with your assignments and boost your productivity with our AI-powered tools.
          </p>

          {isLoggedIn ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xl font-semibold mb-4">Welcome back!</p>
              <motion.button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/generate')}
              >
                Continue to Dashboard
              </motion.button>
            </motion.div>
          ) : (
            <>
              <motion.button
                onClick={signInWithGoogle}
                className="w-full bg-black text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiLogIn size={20} />
                <span>Sign in with Google</span>
              </motion.button>
              <p className="mt-4 text-sm text-gray-500">
                By continuing, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
            </>
          )}
        </motion.div>
      </div>

      {/* Right Section (60%) with overlay */}
      <div className="hidden md:block w-3/5 relative">
      
        <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80')" 
          }}
        ></div>
        <div className="relative z-20 h-full flex flex-col justify-end p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">Study Smarter, Not Harder</h2>
            <p className="text-xl text-gray-200">
              Join thousands of students who are accelerating their learning with our platform.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}