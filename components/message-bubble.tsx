"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/lib/types";
import { Copy, FileText, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { extractTextFromPDF, extractTextFromTextOrDoc } from "@/lib/pdf-utils";
import removeMarkdown from 'remove-markdown';

interface MessageBubbleProps {
  msg: Message;
  isCurrentUser: boolean;
}



export const MessageBubble = ({ msg, isCurrentUser }: MessageBubbleProps) => {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      const plainText = removeMarkdown(msg.content);
      await navigator.clipboard.writeText(plainText);
      toast({
        title: "Copied to clipboard!",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const generatePlainPDF = async (markdown: string): Promise<Blob> => {
      // 1. Strip out markdown syntax
      const text = removeMarkdown(markdown);
    
      // 2. Set up jsPDF for A4
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
    
      // Margins
      const margin = 10; // mm
      const maxLineWidth = pageWidth - margin * 2;
      const lineHeight = 7; // mm per line
      let cursorY = margin;
    
      // 3. Split into lines that fit the width
      const lines = doc.splitTextToSize(text, maxLineWidth);
    
      // 4. Render line by line, adding pages as needed
      for (const line of lines) {
        if (cursorY + lineHeight > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
      }
    
      // 5. Output as Blob
      return doc.output("blob");
    };

  const generateDOCX = async (text: string): Promise<Blob> => {
      // Remove all markdown formatting from the input text
      const cleanedText = removeMarkdown(text);
      
      // Split the cleaned text into paragraphs by two newline characters
      const paragraphs = cleanedText.split("\n\n").map((content) =>
        new Paragraph({
          children: [new TextRun(content)],
          spacing: { after: 200 },
        })
      );
    
      // Create the document with the generated paragraphs
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });
    
      // Return the DOCX blob
      return Packer.toBlob(doc);
    };



  const handleDownload = async (generator: (content: string) => Promise<Blob>, ext: string) => {
    try {
      const blob = await generator(msg.content);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `message-${msg.id.slice(0, 6)}.${ext}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: `Failed to generate ${ext.toUpperCase()}`,
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} gap-1`}>
        <div className={`
          max-w-xl p-4 rounded-lg
          ${isCurrentUser ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-gray-800 border dark:border-gray-700"}
          space-y-2
        `}>
          <div className="leading-relaxed">
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
                  <ul className="list-disc pl-5 space-y-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-5 space-y-1" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="mb-1" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" {...props} />
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>

          {/* Action Icons */}
          
<div className="flex items-center gap-2 mt-2">
  {!isCurrentUser && (
    <>
      <button
        onClick={handleCopy}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Copy to clipboard"
      >
        <Copy className="h-4 w-4" />
      </button>

      <button
        onClick={() => handleDownload(generateDOCX, 'docx')}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Download as DOCX"
      >
        <FileText className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDownload(generatePlainPDF, 'pdf')}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Download as PDF"
      >
        <FileCode className="h-4 w-4" />
      </button>
    </>
  )}
</div>

        </div>

        <p className={`text-xs opacity-70 ${isCurrentUser ? "pr-2" : "pl-2"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};