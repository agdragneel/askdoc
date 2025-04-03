"use client";
import { useState, useCallback, useRef, ChangeEvent, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, UploadCloud, X, ArrowLeft } from "lucide-react";
import { extractTextFromPDF } from "@/lib/pdf-utils";
import mammoth from "mammoth";
import { generateEmbedding } from "@/lib/embeddings";
import {
  generateAnswer,
  generateStructuredResponse,
  extractQuestionsFromText,
} from "@/lib/gemini";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";

type RubricSection = {
  [key: string]: string;
};

type AssignmentDetails = {
  purpose: string;
  guidelines: string;
  rubrics: RubricSection;
  gradingScheme: string;
  classification: "Worksheet" | "Research Proposal";
  confidence: number;
};

type QAPair = {
  question: string;
  answer: string;
  status: "pending" | "processing" | "complete";
};

export default function AssignmentAnalyzer() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chat_id");
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [details, setDetails] = useState<AssignmentDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "solutions">("details");
  const [questions, setQuestions] = useState<string[]>([]);
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedAnswers, setParsedAnswers] = useState<{ [key: number]: string }>({});
  const [summary, setSummary] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    const parseAnswers = async () => {
      const parsed: { [key: number]: string } = {};
      for (let i = 0; i < qaPairs.length; i++) {
        parsed[i] = await marked.parse(qaPairs[i].answer);
      }
      setParsedAnswers(parsed);
    };
    parseAnswers();
  }, [qaPairs]);

  // Add useEffect for automatic summarization
  useEffect(() => {
    const handleGenerateSummary = async () => {
      if (!chatId || !details || details.classification !== "Research Proposal") return;

      setIsSummarizing(true);
      try {
        const fetchAllChunks = async () => {
          let allChunks: any[] = [];
          let page = 0;
          const itemsPerPage = 100;

          while (true) {
            const { data, error } = await supabase
              .from('documents')
              .select('id, content, created_at')
              .eq('chat_id', chatId)
              .order('created_at', { ascending: true })
              .range(page * itemsPerPage, (page + 1) * itemsPerPage - 1);

            if (error) throw error;
            if (!data?.length) break;
            
            allChunks = [...allChunks, ...data];
            page++;
          }
          return allChunks;
        };

        const summarizeBatch = async (
          chunks: any[],
          previousSummary = "",
          processedCount = 0
        ): Promise<string> => {
          if (!chunks.length) return previousSummary;

          const batchSize = 10;
          const currentBatch = chunks.slice(0, batchSize);
          const remainingChunks = chunks.slice(batchSize);
          
          try {
            const batchContent = currentBatch
              .map(c => c.content)
              .join('\n\n')
              .substring(0, 6000);

            const summaryPrompt = previousSummary
              ? `Previous context summary: ${previousSummary.substring(0, 2000)}
              New content to integrate:
              ${batchContent}
              Generate an updated comprehensive summary that incorporates the new content while maintaining important details from the previous context.`
              : `Generate a detailed summary of the following content, focusing on key concepts, relationships, and technical details:
              ${batchContent}`;

            const batchSummary = await generateAnswer(summaryPrompt);
            
            setProcessingProgress(processedCount + currentBatch.length);
            return summarizeBatch(
              remainingChunks,
              `${previousSummary}\n${batchSummary}`.substring(0, 4000),
              processedCount + currentBatch.length
            );
          } catch (error) {
            toast({
              title: "Summarization error",
              description: "Failed to process batch, retrying...",
              variant: "destructive"
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            return summarizeBatch(chunks, previousSummary, processedCount);
          }
        };

        const allChunks = await fetchAllChunks();
        setProcessingProgress(0);
        
        const finalSummary = await summarizeBatch(allChunks);
        setSummary(finalSummary);
        
        await supabase
          .from('knowledge_summaries')
          .upsert({
            chat_id: chatId,
            summary: finalSummary,
            updated_at: new Date().toISOString()
          });

        toast({
          title: "Knowledge summary generated",
          description: "Base knowledge has been successfully summarized"
        });
      } catch (error) {
        toast({
          title: "Summarization failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        });
      }
      setIsSummarizing(false);
    };

    if (details?.classification === "Research Proposal") {
      handleGenerateSummary();
    }
  }, [details, chatId, toast]);

  // Rest of your existing functions remain the same (handleFileChange, removeFile, readFileContent, analyzeAssignment, answerQuestions)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Existing UI components remain the same */}

        {details && (
          <div className="p-6">
            {/* Existing tabs and details rendering remain the same */}

            {details.classification === "Research Proposal" && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Research Proposal Support
                </h2>
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Knowledge Base Summary</h3>
                  
                  {isSummarizing ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing {processingProgress} chunks...</span>
                    </div>
                  ) : summary ? (
                    <div className="mt-6 p-4 bg-white rounded-md border">
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{
                        __html: marked.parse(summary)
                      }} />
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800">
                        Analyzing research documents and generating summary...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}