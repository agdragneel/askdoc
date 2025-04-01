"use client";
import { Chat } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

interface SidebarProps {
  chats: Chat[];
  selectedChat: Chat | null;
  user: User | null;
  onCreateNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  chats,
  selectedChat,
  user,
  onCreateNewChat,
  onSelectChat,
  onDeleteChat,
  onLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  // Expanded width increased to 320px, collapsed remains at 64px.
  const expandedWidth = 400;
  const collapsedWidth = 64;
  const sidebarWidth = collapsed ? collapsedWidth : expandedWidth;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, width: sidebarWidth }}
      animate={{ opacity: 1, x: 0, width: sidebarWidth }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 border-r border-blue-300 p-4 flex flex-col shadow-md"
      style={{ width: sidebarWidth }}
    >
      {/* Header with "Chat History" and collapse toggle */}
      <div className="flex items-center justify-between mb-4">
        {!collapsed && (
          <h2 className="text-lg font-bold text-blue-900 dark:text-blue-200">
            Chat History
          </h2>
        )}
        <Button onClick={toggleCollapse} variant="ghost" size="icon" className="p-1">
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-blue-900 dark:text-blue-200" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-blue-900 dark:text-blue-200" />
          )}
        </Button>
      </div>

      {/* Render sidebar content only if not collapsed */}
      {!collapsed && (
        <>
          {/* New Chat Button */}
          <Button
            onClick={onCreateNewChat}
            className="mb-4 w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>

          {/* Chat List */}
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-600">
            {chats.map((chat) => (
              <motion.div
                key={chat.id}
                className="group relative mb-2"
                whileHover={{ scale: 1.02 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => onSelectChat(chat)}
                  className={`w-full justify-start flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
                    selectedChat?.id === chat.id
                      ? "bg-blue-200 dark:bg-blue-700"
                      : "hover:bg-blue-50 dark:hover:bg-blue-800"
                  }`}
                >
                  <span className="truncate font-medium text-blue-900 dark:text-blue-100">
                    {chat.title}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={() => onDeleteChat(chat.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Logout Button */}
          <div className="mt-auto">
            <Button
              onClick={onLogout}
              variant="ghost"
              className="w-full border-t pt-4 flex items-center text-blue-900 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-800 rounded-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Logout
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
