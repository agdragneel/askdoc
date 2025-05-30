"use client";
import { Loader2, ClipboardList, Globe, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, forwardRef } from "react";
import type { ChangeEventHandler } from "react";
import { motion } from "framer-motion";

type ChatInputProps = {
  isLoading: boolean;
  isProcessingAssignment: boolean;
  currentQuestionIndex: number;
  question: string;
  onQuestionChange: (text: string) => void;
  onSend: () => void;
  onAssignmentUpload: ChangeEventHandler<HTMLInputElement>;
  onFileUpload: ChangeEventHandler<HTMLInputElement>;
  inputRef: React.RefObject<HTMLDivElement>;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  reasonEnabled: boolean;
  onToggleReason: () => void;
};

export const ChatInput = forwardRef<HTMLDivElement, ChatInputProps>(
  (
    {
      isLoading,
      isProcessingAssignment,
      currentQuestionIndex,
      question,
      onQuestionChange,
      onSend,
      onAssignmentUpload,
      onFileUpload,
      inputRef,
      webSearchEnabled,
      onToggleWebSearch,
      reasonEnabled,
      onToggleReason,
    },
    ref
  ) => {
    const assignmentInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey && (!isLoading && !isProcessingAssignment)) {
        e.preventDefault();
        onSend();
        if (inputRef.current) {
          inputRef.current.innerText = "";
          inputRef.current.classList.add("empty");
        }
      }
    };

    const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onAssignmentUpload(e);
      if (assignmentInputRef.current) {
        assignmentInputRef.current.value = '';
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onFileUpload(e);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-t bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4"
      >
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {isProcessingAssignment && (
            <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Processing question {currentQuestionIndex + 1} of assignment...
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {/* Knowledge Base Upload Button */}
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isProcessingAssignment}
                className="h-[44px] border-slate-600 rounded-full text-slate-600 hover:bg-slate-600 hover:text-white"
                title="Upload Knowledge Base"
              >
                <Brain className="h-5 w-5" />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                  onChange={handleFileChange}
                  multiple
                />
              </Button>
            </motion.div>

            {/* Assignment Upload Button */}
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => assignmentInputRef.current?.click()}
                disabled={isLoading || isProcessingAssignment}
                className="h-[44px] border-slate-600 rounded-full text-slate-600 hover:bg-slate-600 hover:text-white"
                title="Upload Assignment"
              >
                {isProcessingAssignment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ClipboardList className="h-5 w-5" />
                )}
                <input
                  type="file"
                  ref={assignmentInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleAssignmentChange}
                />
              </Button>
            </motion.div>

            {/* Web Search Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleWebSearch}
                disabled={isLoading || isProcessingAssignment}
                title="Toggle Web Search"
                className={`h-[44px] ${
                  webSearchEnabled
                    ? "bg-slate-600 text-white rounded-full"
                    : "border-slate-600 text-slate-600 rounded-full hover:bg-slate-600 hover:text-white"
                }`}
              >
                <motion.div
                  animate={{ rotate: webSearchEnabled ? 0 : 360 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <Globe className="h-5 w-5" />
                </motion.div>
              </Button>
            </motion.div>

            {/* Reason Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={reasonEnabled ? "default" : "outline"}
                onClick={onToggleReason}
                disabled={isLoading || isProcessingAssignment}
                className={`h-[44px] px-3 ${
                  reasonEnabled
                    ? "bg-slate-600 text-white rounded-full"
                    : "border-slate-600 text-slate-600 rounded-full hover:bg-slate-600 hover:text-white"
                }`}
              >
                Reason
              </Button>
            </motion.div>

            {/* Input Field */}
            <div
              ref={inputRef}
              contentEditable={(!isLoading && !isProcessingAssignment)}
              onInput={(e) => {
                const text = e.currentTarget.textContent || "";
                onQuestionChange(text);
                e.currentTarget.classList.toggle("empty", !text);
              }}
              onKeyDown={handleKeyDown}
              className={`flex-1 border rounded-lg p-2 bg-white dark:bg-gray-700 focus:outline-none
                          min-h-[44px] max-h-32 overflow-y-auto relative empty:before:content-[attr(placeholder)] 
                          empty:before:text-slate-400 empty:before:dark:text-slate-300 empty:before:absolute 
                          empty:before:top-2 empty:before:left-2 empty:before:pointer-events-none 
                          ${(isLoading || isProcessingAssignment) ? "pointer-events-none opacity-50" : ""}`}
              placeholder={ (isLoading || isProcessingAssignment) ? "Processing..." : "Type your question here..."}
              suppressContentEditableWarning={true}
            />

            {/* Send Button */}
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                onClick={() => {
                  if ((!isLoading && !isProcessingAssignment)) {
                    onSend();
                    if (inputRef.current) {
                      inputRef.current.innerText = "";
                      inputRef.current.classList.add("empty");
                    }
                  }
                }}
                disabled={isLoading || isProcessingAssignment}
                className="h-[44px] bg-slate-800 rounded-full hover:bg-slate-900 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }
);

ChatInput.displayName = "ChatInput";
