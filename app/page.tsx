"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Chat = {
  id: string;
  created_at: string;
  title: string;
  files: string;
  user_id: string;
};

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) router.push("/login");
      else {
        setUser(data.user);
        fetchChats(data.user.id);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const fetchChats = async (userId: string) => {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) setChats(data);
  };

  const createNewChat = () => {
    setSelectedChat(null);
    setMessages([]);
    setFiles([]);
    setIsCreatingNewChat(true);
  };

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsCreatingNewChat(false);
    
    // Fetch files content if exists
    if (chat.files) {
      setFiles([{
        id: chat.id,
        name: "Chat Files",
        content: chat.files,
        size: 0,
        type: "text/plain"
      }]);
    }

    // Load messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });

    if (!error) {
      setMessages(messages);
    } else {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteChat = async (chatId: string) => {
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (!error) {
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (selectedChat?.id === chatId) createNewChat();
    }
  };

  const handleFilesProcessed = async (processedFiles: UploadedFile[]) => {
    setFiles(processedFiles);
    if (processedFiles.length > 0 && user) {
      const title = await generateTitle(
        processedFiles[0].name,
        processedFiles[0].content
      );
      
      const { data } = await supabase
        .from("chats")
        .insert([{
          title,
          user_id: user.id,
          files: processedFiles[0].content
        }])
        .select()
        .single();

      if (data) {
        setChats(prev => [data, ...prev]);
        setSelectedChat(data);
        setIsCreatingNewChat(false);
      }
    }
  };

  const saveMessage = async (chatId: string, role: "user" | "assistant", content: string) => {
    const { error } = await supabase
      .from("messages")
      .insert([{
        chat_id: chatId,
        role,
        content
      }]);

    if (error) throw error;
  };

  const buildChatContext = () => {
    const fileContents = files.map(f => f.content).join("\n\n");
    const conversationHistory = messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");
    
    return `${fileContents}\n\nChat History:\n${conversationHistory}`;
  };

  const askGemini = useCallback(async () => {
    if (!question.trim() || !user) return;

    setIsLoading(true);
    try {
      let chatId = selectedChat?.id;

      // Create new chat if needed
      if (!chatId) {
        const fileContents = files.map(f => f.content).join("\n\n");
        const { data } = await supabase
          .from("chats")
          .insert([{
            title: "New Chat",
            user_id: user.id,
            files: fileContents
          }])
          .select()
          .single();

        if (data) {
          chatId = data.id;
          setChats(prev => [data, ...prev]);
          setSelectedChat(data);
        }
      }

      if (!chatId) throw new Error("Chat creation failed");

      // Save user message
      await saveMessage(chatId, "user", question);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        content: question,
        created_at: new Date().toISOString()
      }]);

      // Build context
      const context = buildChatContext();

      // Get AI response
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${context}\nUser: ${question}`
              }]
            }]
          }),
        }
      );

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

      // Save AI response
      await saveMessage(chatId, "assistant", botResponse);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: botResponse,
        created_at: new Date().toISOString()
      }]);

      setQuestion("");
      if (inputRef.current) inputRef.current.innerText = "";
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [question, files, messages, user, API_KEY, toast, selectedChat]);

  const generateTitle = async (fileName: string, content: string) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a concise title for a chat about ${fileName}. Content snippet: ${content.slice(0, 500)}. Return only the title.`
            }]
          }]
        }),
      }
    );
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "New Chat";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askGemini();
    }
  };

  if (loading) return (
    <div className="flex justify-center p-4">
      <Loader2 className="animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r p-4 flex flex-col">
        <Button onClick={createNewChat} className="mb-4">
          <Plus className="mr-2" /> New Chat
        </Button>
        <div className="overflow-y-auto flex-1">
          {chats.map(chat => (
            <div key={chat.id} className="group relative">
              <Button
                variant="ghost"
                onClick={() => selectChat(chat)}
                className={`w-full justify-start ${selectedChat?.id === chat.id ? "bg-gray-100" : ""}`}
              >
                <span className="truncate">{chat.title}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1 opacity-0 group-hover:opacity-100"
                onClick={() => deleteChat(chat.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xl p-3 rounded-lg ${
                      msg.role === "user" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-2">
                <div
                  ref={inputRef}
                  contentEditable
                  onInput={(e) => setQuestion(e.currentTarget.textContent || "")}
                  onKeyDown={handleKeyDown}
                  className="flex-1 border rounded-lg p-2 bg-white dark:bg-gray-800 focus:outline-none"
                  suppressContentEditableWarning={true}
                />
                <Button onClick={askGemini} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
          </div>
        ) : isCreatingNewChat ? (
          <div className="flex-1 flex items-center justify-center">
            <FileUpload
              onFilesProcessed={handleFilesProcessed}
              maxFileSize={20 * 1024 * 1024}
              acceptedFileTypes={[".pdf", ".txt", ".doc", ".docx"]}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              AI Assignment Assistant
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Upload your notes and assignments to get started!
            </p>
            <Button onClick={createNewChat}>
              <Plus className="mr-2" /> Start New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}