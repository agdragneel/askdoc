"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile, Message, Chat } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import { Loader2, Plus, Trash2, ClipboardList, Upload } from "lucide-react";
import { extractTextFromPDF, extractTextFromTextOrDoc } from "@/lib/pdf-utils";
import { jsPDF } from "jspdf";
import mammoth from "mammoth";
import { Sidebar } from "@/components/sidebar";
import { MessageBubble } from "@/components/message-bubble";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ChatInput } from "@/components/chat-input";
import Head from 'next/head';

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
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
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

    // Create empty chat immediately
    if (user) {
      supabase
        .from("chats")
        .insert([
          {
            title: "New Chat",
            user_id: user.id,
            files: "",
          },
        ])
        .select()
        .single()
        .then(({ data }) => {
          if (data) {
            setChats((prev) => [data, ...prev]);
            setSelectedChat(data);
          }
        });
    }
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
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);  // Remove selected chat instead of creating new
        setMessages([]);        // Clear messages
        setFiles([]);           // Clear files
      }
    }
  };

  const handleFilesProcessed = async (processedFiles: UploadedFile[]) => {
    setIsProcessingFile(true);
    try {
      if (selectedChat && user) {
        // Update existing chat with new files
        const newContent = processedFiles.map((f) => f.content).join("\n\n");
        const updatedFiles = selectedChat.files
          ? `${selectedChat.files}\n\n${newContent}`
          : newContent;
  
        const { data: updatedChat, error } = await supabase
          .from("chats")
          .update({ files: updatedFiles })
          .eq("id", selectedChat.id)
          .select()
          .single();
  
        if (error) throw error;
        if (updatedChat) {
          // Update title if still "New Chat"
          if (updatedChat.title === "New Chat" && processedFiles.length > 0) {
            const newTitle = await generateTitle(
              processedFiles[0].name,
              processedFiles[0].content.slice(0, 500)
            );
            
            const { data: titledChat } = await supabase
              .from("chats")
              .update({ title: newTitle })
              .eq("id", updatedChat.id)
              .select()
              .single();
  
            if (titledChat) {
              setSelectedChat(titledChat);
              setChats(prev => prev.map(c => c.id === titledChat.id ? titledChat : c));
              setFiles((prev) => [...prev, ...processedFiles]);
            } else {
              setSelectedChat(updatedChat);
              setFiles((prev) => [...prev, ...processedFiles]);
            }
          } else {
            setSelectedChat(updatedChat);
            setFiles((prev) => [...prev, ...processedFiles]);
          }
        }
      } else if (user) {
        // Create new chat with uploaded files
        setFiles(processedFiles);
        const title = await generateTitle(
          processedFiles[0]?.name || "New Chat",
          processedFiles[0]?.content || ""
        );
  
        const { data } = await supabase
          .from("chats")
          .insert([
            {
              title,
              user_id: user.id,
              files: processedFiles.map((f) => f.content).join("\n\n"),
            },
          ])
          .select()
          .single();
  
        if (data) {
          // Update title if generated title is still "New Chat"
          if (data.title === "New Chat" && processedFiles.length > 0) {
            const newTitle = await generateTitle(
              processedFiles[0].name,
              processedFiles[0].content.slice(0, 500)
            );
            
            const { data: titledChat } = await supabase
              .from("chats")
              .update({ title: newTitle })
              .eq("id", data.id)
              .select()
              .single();
  
            if (titledChat) {
              setChats((prev) => [titledChat, ...prev]);
              setSelectedChat(titledChat);
            } else {
              setChats((prev) => [data, ...prev]);
              setSelectedChat(data);
            }
          } else {
            setChats((prev) => [data, ...prev]);
            setSelectedChat(data);
          }
          setIsCreatingNewChat(false);
        }
      }
    } catch (error) {
      toast({
        title: "File processing error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessingFile(false);
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
      let newChat = null;

      // Create new chat if needed (even without files)
      if (!chatId) {
        const title = await generateTitle("Chat", question.slice(0, 100));
        const { data } = await supabase
          .from("chats")
          .insert([
            {
              title,
              user_id: user.id,
              files: files.map((f) => f.content).join("\n\n"), // Handle empty files
            },
          ])
          .select()
          .single();

        if (data) {
          newChat = data;
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

      // Build context from both files and chat history
      const context = buildChatContext();

      // Get AI response
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

      // Update chat title if it's new
      if ((selectedChat?.title === "New Chat" || newChat) && question) {
        const titleContent =
          files.length > 0
            ? files[0].content.slice(0, 500)
            : question.slice(0, 500);

        const newTitle = await generateTitle(
          files.length > 0 ? files[0].name : "Chat",
          titleContent
        );

        const { data: updatedChat } = await supabase
          .from("chats")
          .update({ title: newTitle })
          .eq("id", chatId)
          .select()
          .single();

        if (updatedChat) {
          setSelectedChat(updatedChat);
          setChats((prev) =>
            prev.map((chat) => (chat.id === chatId ? updatedChat : chat))
          );
        }
      }

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
  }, [question, files, messages, user, toast, selectedChat, webSearchEnabled]);

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
        // Update title if still "New Chat"
        if (selectedChat.title === "New Chat") {
          const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
          const newTitle = await generateTitle(fileName, fileContent.slice(0, 500));
          
          const { data: titledChat } = await supabase
            .from("chats")
            .update({ title: newTitle })
            .eq("id", selectedChat.id)
            .select()
            .single();
  
          if (titledChat) {
            setSelectedChat(titledChat);
            setChats(prev => prev.map(c => c.id === titledChat.id ? titledChat : c));
          } else {
            setSelectedChat(updatedChat);
          }
        } else {
          setSelectedChat(updatedChat);
        }
        setChats(prev =>
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
        formattedAnswers += `**Question ${i + 1}:** ${questions[i]}\n\n`;
        formattedAnswers += `**Answer ${i + 1}:** ${answer}\n\n`;
        formattedAnswers += "---\n\n"; // Separator between Q&A pairs
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPos = 20;
  
    doc.setFont("helvetica"); // More universal font
    doc.setFontSize(12);
  
    // Split text into lines that fit page width
    const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
  
    splitText.forEach((line: string) => {
      if (yPos > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
  
    return doc.output("blob");
  };

  // Function to generate DOCX
  const generateDOCX = async (text: string): Promise<Blob> => {
    const paragraphs = text.split('\n\n').map(content => 
      new Paragraph({
        children: [new TextRun(content)],
        spacing: { after: 200 },
      })
    );
  
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });
  
    return Packer.toBlob(doc);
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

  const processFileList = async (files: FileList): Promise<UploadedFile[]> => {
    const processedFiles: UploadedFile[] = [];
    setIsProcessingUpload(true);
    setUploadSuccess(false);

    try {
      for (const file of Array.from(files)) {
        let content = "";

        if (file.type === "application/pdf") {
          content = await extractTextFromPDF(file);
        } else {
          content = await extractTextFromTextOrDoc(file);
        }

        processedFiles.push({
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          content,
        });
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
      return processedFiles;
    } catch (error) {
      throw error;
    } finally {
      setIsProcessingUpload(false);
    }
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
      <Head>
        <title>StudyBuddy</title>
      </Head>
      <Sidebar
        chats={chats}
        selectedChat={selectedChat}
        user={user}
        onCreateNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-screen">
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Chat Header with File Upload */}
            <div className="p-4 border-b bg-white dark:bg-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-200">
                  {selectedChat.title}
                </h2>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Created{" "}
                  {new Date(selectedChat.created_at).toLocaleDateString()}
                </p>
              </div>
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

            <div className="px-4 space-y-2">
              {isProcessingUpload && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing files...</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-sm">Files uploaded successfully!</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <ChatInput
              ref={chatEndRef}
              isLoading={isLoading}
              isProcessingAssignment={isProcessingAssignment}
              currentQuestionIndex={currentQuestionIndex}
              question={question}
              onQuestionChange={setQuestion}
              onSend={askGemini}
              onAssignmentUpload={(e) => handleAssignmentUpload(e.target.files)}
              inputRef={inputRef}
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={toggleWebSearch}
              onFileUpload={async (e) => {
                if (e.target.files) {
                  try {
                    const processed = await processFileList(e.target.files);
                    handleFilesProcessed(processed);
                  } catch (error) {
                    setUploadSuccess(false);
                    toast({
                      title: "File upload failed",
                      description:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                      variant: "destructive",
                    });
                  }
                }
              }}
            />
          </div>
        ) :  (
          // New Empty State
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

            <div className="flex flex-col gap-4">
              <Button
                onClick={createNewChat}
                className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                <Plus className="mr-2 h-5 w-5" /> Start Empty Chat
              </Button>

  
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
