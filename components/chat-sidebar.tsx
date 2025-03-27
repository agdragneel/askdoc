// components/chat-sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

export function ChatSidebar({
  user,
  onChatSelect,
  currentChatId,
}: {
  user: User | null;
  onChatSelect: (chatId: string) => void;
  currentChatId: string | null;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching chats:", error);
      } else {
        setChats(data || []);
      }
      setLoading(false);
    };

    fetchChats();
  }, [user]);

  const createNewChat = async () => {
    setChats([]);
    onChatSelect("");
  };

  if (loading) {
    return <div className="p-4">Loading chats...</div>;
  }

  return (
    <div className="w-64 h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          onClick={createNewChat}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onChatSelect(chat.id)}
            className={`p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
              currentChatId === chat.id
                ? "bg-gray-300 dark:bg-gray-600"
                : ""
            }`}
          >
            <h3 className="font-medium truncate">{chat.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(chat.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}