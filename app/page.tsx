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
import { Document, Packer, Paragraph, TextRun } from "docx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  generateChatResponse,
  extractQuestionsFromText,
  generateSearchQuery,
  generateAnswerWithWebSearch
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
    router.push("/login");
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
      const botResponse = await generateChatResponse(context, question);
  
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
      let combinedAnswers = "";
      for (let i = 0; i < questions.length; i++) {
        setCurrentQuestionIndex(i);
        const answer = await generateAnswerForQuestion(questions[i]);
        combinedAnswers += `${i + 1}. ${answer}\n\n`;
      }

      // Generate PDF and DOCX files
      const pdfBlob = generatePDF(combinedAnswers);
      const docxBlob = await generateDOCX(combinedAnswers);

      // Convert Blobs to base64
      const pdfBase64 = await blobToBase64(pdfBlob);
      const docxBase64 = await blobToBase64(docxBlob);

      // Build your attachments array
      const attachments = [
        {
          type: "pdf",
          data: pdfBase64,
          name: "assignment-answers.pdf",
        },
        {
          type: "docx",
          data: docxBase64,
          name: "assignment-answers.docx",
        },
      ];

      // Convert blobs to object URLs
      const pdfFileUrl = URL.createObjectURL(pdfBlob);
      const docxFileUrl = URL.createObjectURL(docxBlob);
      setPdfUrl(pdfFileUrl);
      setDocxUrl(docxFileUrl);

      // Send AI message with answers and buttons
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: combinedAnswers,
        created_at: new Date().toISOString(),
        attachments: [
          {
            type: "pdf",
            data: pdfFileUrl, // Actually, this should be the base64 string from your conversion, not the URL.
            name: "assignment-answers.pdf",
          },
          {
            type: "docx",
            data: docxFileUrl, // This should be the base64 string as well.
            name: "assignment-answers.docx",
          },
        ],
      };

      await saveMessage(
        updatedChat?.id || selectedChat.id,
        "assistant",
        combinedAnswers,
        attachments
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
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
    const doc = new jsPDF();
    doc.setFont("times", "normal");
    doc.setFontSize(12); // Set font size to 12
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    // Splitting text to preserve two newlines between answers
    const lines = doc.splitTextToSize(text, maxLineWidth);
    doc.text(lines, margin, 30);
    return doc.output("blob");
  };

  // Function to generate DOCX
  const generateDOCX = async (text: string): Promise<Blob> => {
    // Split text on double newlines into paragraphs
    const paragraphs = text.split("\n\n").map(
      (para) =>
        new Paragraph({
          children: [
            new TextRun({
              text: para,
              font: "Times New Roman",
              size: 24, // 12pt = 24 half-points
            }),
          ],
          spacing: {
            after: 200, // adjust spacing as needed
          },
        })
    );

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
    if (file.type === "application/pdf") {
      return extractTextFromPDF(file);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const extractQuestionsFromContent = async (content: string) => {
    return extractQuestionsFromText(content);
  };

  
  const generateAnswerForQuestion = async (question: string) => {
    try {
      const context = buildChatContext();
      return generateAnswerWithWebSearch(context, question);
    } catch (error) {
      console.error("Error generating answer:", error);
      return "Failed to generate answer";
    }
  };
  
  
  

  // HTML PART//

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r p-4 flex flex-col">
        <div className="flex-1">
          <Button onClick={createNewChat} className="mb-4 w-full">
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
          <div className="overflow-y-auto h-[calc(100vh-180px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {chats.map((chat) => (
              <div key={chat.id} className="group relative">
                <Button
                  variant="ghost"
                  onClick={() => selectChat(chat)}
                  className={`w-full justify-start text-left ${
                    selectedChat?.id === chat.id
                      ? "bg-gray-100 dark:bg-gray-700"
                      : "hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
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

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="mt-auto border-t pt-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen">
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedChat.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Created {new Date(selectedChat.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <div className="p-4 space-y-4 min-h-full">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xl p-3 rounded-lg prose dark:prose-invert ${
                        msg.role === "user"
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

                      {/* Render download buttons ONLY for messages with attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-x-2">
                          {msg.attachments.map((att, idx) => {
                            // If the attachment data is already a blob URL, use it directly.
                            if (att.data.startsWith("blob:")) {
                              return (
                                <a
                                  key={idx}
                                  href={att.data}
                                  download={att.name}
                                  className="inline-block bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded"
                                >
                                  Download {att.type.toUpperCase()}
                                </a>
                              );
                            }

                            // Otherwise, assume it's a base64 string and convert it.
                            if (!att.data || att.data.trim() === "") {
                              return null;
                            }
                            let byteCharacters;
                            try {
                              byteCharacters = atob(att.data);
                            } catch (error) {
                              console.error(
                                "Invalid base64 string for attachment:",
                                att
                              );
                              return null;
                            }

                            const byteNumbers = new Array(
                              byteCharacters.length
                            );
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const mimeType =
                              att.type === "pdf"
                                ? "application/pdf"
                                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                            const fileBlob = new Blob([byteArray], {
                              type: mimeType,
                            });
                            const fileUrl = URL.createObjectURL(fileBlob);

                            return (
                              <a
                                key={idx}
                                href={fileUrl}
                                download={att.name}
                                className="inline-block bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded"
                              >
                                Download {att.type.toUpperCase()}
                              </a>
                            );
                          })}
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
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input Area with Assignment Upload */}
            <div className="border-t bg-white dark:bg-gray-800 p-4">
              <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                {isProcessingAssignment && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Processing question {currentQuestionIndex + 1} of
                      assignment...
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      document.getElementById("assignment-upload")?.click()
                    }
                    disabled={isLoading || isProcessingAssignment}
                    className="h-[44px]"
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
                      onChange={(e) => handleAssignmentUpload(e.target.files)}
                    />
                  </Button>

                  <div
                    ref={inputRef}
                    contentEditable
                    onInput={(e) => {
                      const text = e.currentTarget.textContent || "";
                      setQuestion(text);
                      e.currentTarget.classList.toggle("empty", !text);
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 border rounded-lg p-2 bg-white dark:bg-gray-700 focus:outline-none
                              min-h-[44px] max-h-32 overflow-y-auto relative empty:before:content-[attr(placeholder)] 
                              empty:before:text-gray-400 empty:before:dark:text-gray-500 empty:before:absolute 
                              empty:before:top-2 empty:before:left-2 empty:before:pointer-events-none"
                    placeholder="Type your question here..."
                    suppressContentEditableWarning={true}
                  />

                  <Button
                    onClick={askGemini}
                    disabled={isLoading}
                    className="h-[44px]"
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
                </div>
              </div>
            </div>
          </div>
        ) : isCreatingNewChat ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            {isProcessingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-gray-600 dark:text-gray-400">
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4 bg-gray-50 dark:bg-gray-900">
            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Hi
                {user?.user_metadata?.full_name
                  ? `, ${user.user_metadata.full_name}`
                  : ""}
                !
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                How can I help you today?
              </p>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                AI Assignment Assistant
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Upload your notes and assignments to get started!
              </p>
            </div>
            <Button onClick={createNewChat} className="px-8 py-4 text-lg">
              <Plus className="mr-2 h-5 w-5" /> Start New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
