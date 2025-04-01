"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/lib/types";

interface MessageBubbleProps {
  msg: Message;
  isCurrentUser: boolean;
}

export const MessageBubble = ({ msg, isCurrentUser }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xl p-3 rounded-lg prose dark:prose-invert ${
          isCurrentUser
            ? "bg-blue-500 text-white"
            : "bg-white dark:bg-gray-800 border dark:border-gray-700"
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            strong: ({ node, ...props }) => (
              <strong className="font-semibold" {...props} />
            ),
            em: ({ node, ...props }) => (
              <em className="italic" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="mb-2 last:mb-0" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc pl-4" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal pl-4" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="mb-1" {...props} />
            ),
            code: ({ node, ...props }) => (
              <code
                className="bg-gray-100 dark:bg-gray-700 px-1 rounded"
                {...props}
              />
            ),
          }}
        >
          {msg.content}
        </ReactMarkdown>

        {/* Centered Attachments with Blue Buttons */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-2 flex justify-center space-x-2">
            {msg.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.data}
                download={att.name}
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-md"
              >
                Download {att.type.toUpperCase()}
              </a>
            ))}
          </div>
        )}

        <p className="text-xs mt-2 opacity-70">
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};
