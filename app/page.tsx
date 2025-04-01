"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
      {/* Animated Header */}
      <motion.h1
        className="text-5xl font-extrabold text-center"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Welcome to <span className="text-yellow-400">StudyBuddy!</span>
      </motion.h1>

      {/* Animated Subheading */}
      <motion.p
        className="mt-6 text-xl text-center"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        Revolutionize the way you study! Upload your notes, ask questions, and
        get solutions instantly.
      </motion.p>

      {/* Animated Feature Section */}
      <motion.div
        className="mt-12 text-center max-w-3xl mx-auto px-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <p className="text-lg text-gray-200">
          StudyBuddy helps you build your own knowledge base by uploading your
          notes. Not only can you store your learnings, but you can also chat
          with them, ask questions, and get instant answers. Need help with your
          assignments? Simply upload them and get solution PDFs delivered to
          you.
        </p>
      </motion.div>

      {/* Call to Action Buttons */}
      <div className="mt-10 flex gap-6">
        {isLoggedIn ? (
          <Link href="/generate">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg">
              Get Assignment Help
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button className="bg-white hover:bg-white hover:text-blue-600 text-black px-6 py-3 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105">
              Get Started
            </Button>
          </Link>
        )}

        {/* "Learn More" Button with Better Visibility */}
        <Link href="/learn-more">
          <Button
            variant="outline"
            className="px-6 py-3 rounded-full shadow-lg border-2 border-white text-black hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105"
          >
            Learn More
          </Button>
        </Link>
      </div>

      {/* Footer Section */}
      <motion.div
        className="absolute bottom-10 text-center text-sm text-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <p>
          Powered by <span className="text-yellow-400">StudyBuddy</span> – Your
          personal assistant for learning and assignments.
        </p>
      </motion.div>
    </div>
  );
}
