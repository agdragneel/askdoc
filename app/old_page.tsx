/*
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile } from "@/lib/types";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch API Key from .env.local
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.push("/login"); // Redirect to login if not authenticated
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // Redirect to login page
  };

  if (loading) return <p>Loading...</p>; // Show loader while checking auth

  const handleFilesProcessed = (processedFiles: UploadedFile[]) => {
    setFiles(processedFiles);
  };

  async function askGemini() {
    if (!files.length) {
      toast({
        title: "No files processed",
        description: "Please upload and process files first",
        variant: "destructive",
      });
      return;
    }

    if (!question.trim()) {
      toast({
        title: "No question provided",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fileContents = files.map((file) => file.content).join("\n\n");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: fileContents + "\nQuestion: " + question }] },
            ],
          }),
        }
      );
      const data = await response.json();
      setAnswer(
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No response from Gemini"
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response from Gemini",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header with User Greeting and Logout */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 ml-128">
            Hello, {user?.user_metadata?.full_name || "User"}!
          </h2>
          <Button
            onClick={handleLogout}
            className="bg-black text-white dark:bg-gray-200 dark:text-black hover:bg-gray-900 dark:hover:bg-gray-300 font-bold px-6 py-2 mr-4 transition-colors"
          >
            Logout
          </Button>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            AI Agents for your Assignments!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload your assignment and let the agents do their magic
          </p>
        </div>

        <FileUpload
          onFilesProcessed={handleFilesProcessed}
          maxFileSize={20 * 1024 * 1024} // 20MB
          acceptedFileTypes={[".pdf", ".txt", ".doc", ".docx"]}
        />

        <Card className="p-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ask a Question
            </label>
            <div className="flex gap-4">
              <Textarea
                placeholder="Enter your question about the documents..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={askGemini}
                disabled={isLoading}
                className="self-start"
              >
                {isLoading ? "Processing..." : "Ask"}
              </Button>
            </div>
          </div>

          {answer && (
            <div className="space-y-2 mt-6">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Response
              </h3>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {answer}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
*//