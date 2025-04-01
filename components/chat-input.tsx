"use client";
import { Loader2, ClipboardList } from "lucide-react";
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
  inputRef: React.RefObject<HTMLDivElement>;
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
      inputRef,
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-t bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 p-4"
      >
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {isProcessingAssignment && (
            <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Processing question {currentQuestionIndex + 1} of assignment...
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  document.getElementById("assignment-upload")?.click()
                }
                disabled={isLoading || isProcessingAssignment}
                className="h-[44px] border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                {isProcessingAssignment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ClipboardList className="h-5 w-5" />
                )}
                <input
                  type="file"
                  id="assignment-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={onAssignmentUpload}
                />
              </Button>
            </motion.div>

            <div
              ref={inputRef}
              contentEditable
              onInput={(e) => {
                const text = e.currentTarget.textContent || "";
                onQuestionChange(text);
                e.currentTarget.classList.toggle("empty", !text);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 border rounded-lg p-2 bg-white dark:bg-gray-700 focus:outline-none
                        min-h-[44px] max-h-32 overflow-y-auto relative empty:before:content-[attr(placeholder)] 
                        empty:before:text-blue-400 empty:before:dark:text-blue-300 empty:before:absolute 
                        empty:before:top-2 empty:before:left-2 empty:before:pointer-events-none"
              placeholder="Type your question here..."
              suppressContentEditableWarning={true}
            />

            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                onClick={onSend}
                disabled={isLoading}
                className="h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
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
