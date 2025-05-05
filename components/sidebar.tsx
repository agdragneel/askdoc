"use client";
import { Chat } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";

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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  const expandedWidth = 300;
  const collapsedWidth = 80;

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <motion.div
      animate={{ width: collapsed ? collapsedWidth : expandedWidth }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-white dark:bg-zinc-900 border-r p-3 flex flex-col shadow-md h-screen relative"
    >
      {/* Always-visible toggle button */}
      <div className="absolute top-3 right-3 z-10">
        <Button
          onClick={toggleCollapse}
          variant="ghost"
          size="icon"
          className="p-1"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Header */}
      <motion.div
        animate={{ opacity: collapsed ? 0 : 1 }}
        className={clsx(
          "text-xl font-semibold text-gray-800 dark:text-white mb-4 mt-1",
          collapsed && "pointer-events-none"
        )}
      >
        Chats
      </motion.div>

      {/* New Chat */}
      {collapsed ? (
        <Button
          onClick={onCreateNewChat}
          className="mb-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          onClick={onCreateNewChat}
          className="mb-4 w-full bg-white border border-blue-600 hover:bg-gray-100 text-blue-700 rounded-xl shadow"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      )}

      {/* Chat list */}
      <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-700">
        {chats.map((chat) => (
          <motion.div
            key={chat.id}
            className="group relative mb-2"
            whileHover={{ scale: 1.01 }}
          >
            <div
              onClick={() => onSelectChat(chat)}
              className={clsx(
                "cursor-pointer w-full px-2 py-2 flex items-center justify-between rounded-2xl transition-all duration-300",
                selectedChat?.id === chat.id
                  ? "bg-blue-100 dark:bg-blue-800"
                  : "hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden w-full">
                <div
                  className={clsx(
                    "flex-shrink-0 flex items-center justify-center font-semibold text-zinc-800 dark:text-white bg-gray-300 dark:bg-zinc-600 ring-2 ring-white dark:ring-zinc-900 transition-all duration-300",
                    collapsed ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
                  )}
                  style={{ borderRadius: "9999px" }}
                >
                  {chat.title
                    ?.split(" ")
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "C"}
                </div>

                <motion.span
                  initial={false}
                  animate={{
                    width: collapsed ? 0 : "auto",
                    opacity: collapsed ? 0 : 1,
                  }}
                  transition={{ duration: 0.25 }}
                  className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[180px] origin-left"
                >
                  {chat.title}
                </motion.span>
              </div>

              {/* Delete */}
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center ml-2"
                  >
                    {confirmingDeleteId === chat.id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            setConfirmingDeleteId(null);
                          }}
                        >
                          ✅
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteId(null);
                          }}
                        >
                          ❌
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1 opacity-60 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDeleteId(chat.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logout */}
      <motion.div
        animate={{ opacity: collapsed ? 0 : 1 }}
        className={clsx(
          "mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700 transition-opacity",
          collapsed && "pointer-events-none"
        )}
      >
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full flex items-center justify-start text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl px-4 py-2"
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
      </motion.div>
    </motion.div>
  );
}
