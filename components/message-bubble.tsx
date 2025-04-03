"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface MessageBubbleProps {
  msg: Message;
  isCurrentUser: boolean;
}

export const MessageBubble = ({ msg, isCurrentUser }: MessageBubbleProps) => {
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      // Extract the full path after 'assignments/'
      const pathParts = filePath.split('assignments/');
      if (pathParts.length < 2) throw new Error("Invalid file path");
      
      const fullPath = pathParts[1];
      const { data, error } = await supabase.storage
        .from('assignments')
        .download(fullPath);

      if (error) throw error;
      if (!data) throw new Error("File not found");

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-xl p-3 rounded-lg prose dark:prose-invert ${
        isCurrentUser ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800 border dark:border-gray-700"
      }`}>
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
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded" {...props} />
            ),
          }}
        >
          {msg.content}
        </ReactMarkdown>

        {msg.attachments?.map((att, idx) => (
          <div key={idx} className="mt-2">
            <Button
              variant="outline"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => handleDownload(att.data, att.name)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download {att.type.toUpperCase()}
            </Button>
          </div>
        ))}

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