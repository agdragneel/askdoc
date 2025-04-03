"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile, Message, Chat } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import { Loader2, Plus, Trash2, ClipboardList } from "lucide-react";
import { extractTextFromPDF } from "@/lib/pdf-utils";
import { jsPDF } from "jspdf";
import { blobToBase64 } from "@/lib/utils";
import { motion } from "framer-motion";
import mammoth from "mammoth";
import { Sidebar } from "@/components/sidebar";
import { MessageBubble } from "@/components/message-bubble";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ChatInput } from "@/components/chat-input";

import {
  generateChatResponse,
  extractQuestionsFromText,
  generateAnswerWithWebSearch,
  generateAnswerWithoutSearch,
  generateChatResponseWithoutSearch,
} from "@/lib/gemini";

export default function Home() {
  const [isProcessingFile, setIsProcessingFile] = useState(false);
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
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
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

  const toggleWebSearch = () => {
    setWebSearchEnabled(!webSearchEnabled);
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsCreatingNewChat(false);

    // Fetch files content if exists
    if (chat.files) {
      setFiles([
        {
          id: chat.id,
          name: "Chat Files",
          content: chat.files,
          size: 0,
          type: "text/plain",
        },
      ]);
    }

    // Load messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, role, content, attachments, created_at") // or select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });

    if (!error) {
      setMessages(messages);
    } else {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteChat = async (chatId: string) => {
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (!error) {
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (selectedChat?.id === chatId) createNewChat();
    }
  };

  const handleFilesProcessed = async (processedFiles: UploadedFile[]) => {
    setIsProcessingFile(true); // Start processing
    try {
      setFiles(processedFiles);
      if (processedFiles.length > 0 && user) {
        const title = await generateTitle(
          processedFiles[0].name,
          processedFiles[0].content
        );

        const { data } = await supabase
          .from("chats")
          .insert([
            {
              title,
              user_id: user.id,
              files: processedFiles[0].content,
            },
          ])
          .select()
          .single();

        if (data) {
          setChats((prev) => [data, ...prev]);
          setSelectedChat(data);
          setIsCreatingNewChat(false);
        }
      }
    } finally {
      setIsProcessingFile(false); // End processing
    }
  };

  async function saveMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string,
    attachments?: {
      type: string;
      data: string; // or url, depending on approach
      name: string;
    }[]
  ) {
    const { error } = await supabase.from("messages").insert([
      {
        chat_id: chatId,
        role,
        content,
        attachments, // pass attachments here
      },
    ]);

    if (error) throw error;
  }

  const buildChatContext = () => {
    const fileContents = files.map((f) => f.content).join("\n\n");
    const conversationHistory = messages
      .map((m) => `${m.role}: ${m.content}`)
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
        const fileContents = files.map((f) => f.content).join("\n\n");
        const { data } = await supabase
          .from("chats")
          .insert([
            {
              title: "New Chat",
              user_id: user.id,
              files: fileContents,
            },
          ])
          .select()
          .single();

        if (data) {
          chatId = data.id;
          setChats((prev) => [data, ...prev]);
          setSelectedChat(data);
        }
      }

      if (!chatId) throw new Error("Chat creation failed");

      // Save user message
      await saveMessage(chatId, "user", question);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: question,
          created_at: new Date().toISOString(),
        },
      ]);

      // Build context
      const context = buildChatContext();

      // Get AI response using service function
      const botResponse = webSearchEnabled
        ? await generateChatResponse(context, question)
        : await generateChatResponseWithoutSearch(context, question);

      // Save AI response
      await saveMessage(chatId, "assistant", botResponse);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: botResponse,
          created_at: new Date().toISOString(),
        },
      ]);

      setQuestion("");
      if (inputRef.current) inputRef.current.innerText = "";
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [question, files, messages, user, toast, selectedChat]);

  const generateTitle = async (fileName: string, content: string) => {
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
                  text: `Generate a concise title for a chat about ${fileName}. Content snippet: ${content.slice(
                    0,
                    500
                  )}. Return only the title.`,
                },
              ],
            },
          ],
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

  if (loading)
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="animate-spin" />
      </div>
    );

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15);
  };

  const handleAssignmentUpload = async (files: FileList | null) => {
    if (!files || !user || !selectedChat) return;
  
    setIsProcessingAssignment(true);
    try {
      const file = files[0];
      const fileContent = await readFileContent(file);
  
      // Update chat with new file content
      const updatedFiles = selectedChat.files
        ? selectedChat.files + "\n" + fileContent
        : fileContent;
      const { data: updatedChat, error: updateError } = await supabase
        .from("chats")
        .update({ files: updatedFiles })
        .eq("id", selectedChat.id)
        .select()
        .single();
  
      if (updateError) throw new Error(updateError.message);
      if (updatedChat) {
        setSelectedChat(updatedChat);
        setChats((prev) =>
          prev.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
        );
      }
  
      // Add a message indicating the assignment upload
      const assignmentMessage = `*Assignment sent*`;
      await saveMessage(
        updatedChat?.id || selectedChat.id,
        "user",
        assignmentMessage
      );
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "user",
          content: assignmentMessage,
          created_at: new Date().toISOString(),
        },
      ]);
  
      // Extract questions and generate answers
      const questions = await extractQuestionsFromContent(fileContent);
      let formattedAnswers = "";
  
      for (let i = 0; i < questions.length; i++) {
        setCurrentQuestionIndex(i);
        const answer = await generateAnswerForQuestion(questions[i]);
        formattedAnswers += `Question ${i + 1}: ${questions[i]}\n\n`;
        formattedAnswers += `Answer ${i + 1}: ${answer}\n\n`;
        formattedAnswers += "-------------------------\n\n";
      }
  
      // Generate files
      const pdfBlob = generatePDF(formattedAnswers);
      const docxBlob = await generateDOCX(formattedAnswers);
  
      // Upload to Supabase Storage
      const storage = supabase.storage.from('assignments');
      const timestamp = Date.now();
      const chatId = encodeURIComponent(selectedChat.id);
  
      // Create unique file paths
      const pdfPath = `answers/${chatId}/${timestamp}_answers.pdf`;
      const docxPath = `answers/${chatId}/${timestamp}_answers.docx`;
  
      // Upload files with proper content types
      const { error: pdfError } = await storage.upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
      
      const { error: docxError } = await storage.upload(docxPath, docxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: '3600'
      });
  
      if (pdfError) throw new Error(`PDF upload failed: ${pdfError.message}`);
      if (docxError) throw new Error(`DOCX upload failed: ${docxError.message}`);
  
      // Get public URLs
      const { data: { publicUrl: pdfUrl } } = storage.getPublicUrl(pdfPath);
      const { data: { publicUrl: docxUrl } } = storage.getPublicUrl(docxPath);
  
      if (!pdfUrl || !docxUrl) throw new Error("Failed to generate download URLs");
  
      // Build attachments array
      const attachments = [
        {
          type: "pdf",
          data: pdfUrl,
          name: "assignment-answers.pdf",
        },
        {
          type: "docx",
          data: docxUrl,
          name: "assignment-answers.docx",
        },
      ];
  
      // Save message with attachments
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: formattedAnswers,
        created_at: new Date().toISOString(),
        attachments,
      };
  
      await saveMessage(
        updatedChat?.id || selectedChat.id,
        "assistant",
        formattedAnswers,
        attachments
      );
      setMessages((prev) => [...prev, assistantMessage]);
  
    } catch (error) {
      console.error('File handling error:', error);
      toast({
        title: "Assignment processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAssignment(false);
      setCurrentQuestionIndex(-1);
    }
  };

  // Function to generate PDF with Times New Roman (Font Size 20)
  const generatePDF = (text: string): Blob => {
    // Remove markdown formatting
    const cleanText = text
      .replace(/\*\*Question \d+:\*\*/g, "Question $1:")
      .replace(/\*\*Answer \d+:\*\*/g, "Answer $1:")
      .replace(/---/g, "");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPos = margin;

    doc.setFont("times", "normal");
    doc.setFontSize(12);

    // Split text into lines and handle pagination
    const lines = doc.splitTextToSize(cleanText, pageWidth - margin * 2);

    lines.forEach((line: string, index: number) => {
      if (yPos + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(line, margin, yPos);
      yPos += lineHeight;

      // Add extra space after questions
      if (line.startsWith("Question")) {
        yPos += lineHeight;
      }
    });

    return doc.output("blob");
  };

  // Function to generate DOCX
  const generateDOCX = async (text: string): Promise<Blob> => {
    // Clean markdown from text
    const cleanText = text
      .replace(/\*\*Question \d+:\*\*/g, "Question $1:")
      .replace(/\*\*Answer \d+:\*\*/g, "Answer $1:")
      .replace(/---/g, "");

    // Split text into Q/A pairs
    const qaPairs = cleanText.split(/(Question \d+:)/g).filter(Boolean);

    const paragraphs = [];
    for (let i = 0; i < qaPairs.length; i += 2) {
      const question = qaPairs[i];
      const answer = qaPairs[i + 1] || "";

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: question.trim(),
              bold: true,
              font: "Times New Roman",
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        })
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: answer.trim(),
              font: "Times New Roman",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBlob(doc);
  };

  // Helper functions
  const readFileContent = async (file: File): Promise<string> => {
    try {
      if (file.type === "application/pdf") {
        return await extractTextFromPDF(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // Handle DOCX files using mammoth
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } else {
        // Fallback for text files
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
    } catch (error) {
      console.error("Error reading file content:", error);
      throw new Error("Failed to read file content");
    }
  };

  const extractQuestionsFromContent = async (content: string) => {
    return extractQuestionsFromText(content);
  };

  const generateAnswerForQuestion = async (question: string) => {
    try {
      const context = buildChatContext();
      return webSearchEnabled
        ? generateAnswerWithWebSearch(context, question)
        : generateAnswerWithoutSearch(context, question);
    } catch (error) {
      console.error("Error generating answer:", error);
      return "Failed to generate answer";
    }
  };

  // HTML PART//

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        selectedChat={selectedChat}
        user={user}
        onCreateNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen">
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-200">
                {selectedChat.title}
              </h2>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                Created {new Date(selectedChat.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-600">
              <div className="p-4 space-y-4 min-h-full">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isCurrentUser={msg.role === "user"}
                  />
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <ChatInput
              ref={chatEndRef}
              isLoading={isLoading}
              isProcessingAssignment={isProcessingAssignment}
              currentQuestionIndex={currentQuestionIndex}
              question={question}
              onQuestionChange={setQuestion} // This will update the question state directly
              onSend={askGemini}
              onAssignmentUpload={(e) => handleAssignmentUpload(e.target.files)}
              inputRef={inputRef}
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={toggleWebSearch}
            />
          </div>
        ) : isCreatingNewChat ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
            {isProcessingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-blue-900 dark:text-blue-200">
                  Processing your files...
                </p>
              </div>
            ) : (
              <FileUpload
                onFilesProcessed={handleFilesProcessed}
                maxFileSize={20 * 1024 * 1024}
                acceptedFileTypes={[".pdf", ".txt", ".doc", ".docx"]}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-200">
                Hi
                {user?.user_metadata?.full_name
                  ? `, ${user.user_metadata.full_name}`
                  : ""}
                !
              </h2>
              <p className="text-lg text-blue-600 dark:text-blue-300">
                <i>How can I help you today?</i>
              </p>
            </div>

            <Button
              onClick={createNewChat}
              className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              <Plus className="mr-2 h-5 w-5" /> Start New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
