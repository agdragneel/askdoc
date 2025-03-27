"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile } from "@/lib/types";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    []
  );
  const [question, setQuestion] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filesProcessed, setFilesProcessed] = useState(false);
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFilesProcessed = (processedFiles: UploadedFile[]) => {
    setFiles(processedFiles);
    setFilesProcessed(true);
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
      const conversationHistory = messages.map((m) => m.text).join("\n");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${fileContents}\n\nChat History:\n${conversationHistory}\n${question}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const botResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response from Gemini";

      setMessages([
        ...messages,
        { role: "User", text: question },
        { role: "AI", text: botResponse },
      ]);

      setQuestion("");
      if (inputRef.current) inputRef.current.innerText = ""; // Clear the input field
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askGemini();
    }
  };

  if (loading)
    return (
      <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>
    );

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Hello, {user?.user_metadata?.full_name || "User"}!
          </h2>
          <Button
            onClick={handleLogout}
            className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-lg"
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

        {!filesProcessed ? (
  <FileUpload
    onFilesProcessed={handleFilesProcessed}
    maxFileSize={20 * 1024 * 1024}
    acceptedFileTypes={[".pdf", ".txt", ".doc", ".docx"]}
  />
) : (
  <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded-lg">
    <span className="text-gray-900 dark:text-gray-100">{files[0].name}</span>
    
  </div>
)}

        {filesProcessed && (
          <Card className="p-6 space-y-4">
            {/* Chat Display Box (Hidden Until First Message) */}
            {messages.length > 0 && (
              <div
                className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-y-auto transition-all duration-300"
                style={{ maxHeight: "400px", minHeight: "50px" }}
              >
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "User" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-2xl shadow-md break-words ${
                        msg.role === "User"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Text Input Box (Always Visible) */}
            <div className="flex gap-4">
            <div
  ref={inputRef}
  contentEditable
  className="relative flex-1 border rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
  onInput={(e) => setQuestion(e.currentTarget.textContent || "")}
  onKeyDown={handleKeyDown}
  onFocus={() => setIsFocused(true)}
  onBlur={(e) => setIsFocused(e.currentTarget.textContent !== "")}
  suppressContentEditableWarning={true}
  style={{
    minHeight: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "start",
    position: "relative",
  }}
>
  {!isFocused && !question && <span className="text-gray-400 select-none absolute left-2">Ask your question!</span>}
</div>

              <Button
                onClick={askGemini}
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
              >
                {isLoading ? "Processing..." : "Send"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
