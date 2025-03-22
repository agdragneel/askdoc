"use client";

// import { useState } from "react";
// import { FileUpload } from "@/components/file-upload";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Card } from "@/components/ui/card";
// import { Send } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { UploadedFile } from "@/lib/types";

// export default function Home() {
//   const [files, setFiles] = useState<UploadedFile[]>([]);
//   const [question, setQuestion] = useState("");
//   const [answer, setAnswer] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const { toast } = useToast();

//   const handleFilesProcessed = (processedFiles: UploadedFile[]) => {
//     setFiles(processedFiles);
//   };

//   async function askGemini() {
//     if (!files.length) {
//       toast({
//         title: "No files processed",
//         description: "Please upload and process files first",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (!question.trim()) {
//       toast({
//         title: "No question provided",
//         description: "Please enter a question",
//         variant: "destructive",
//       });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const fileContents = files.map(file => file.content).join("\n\n");
//       const response = await fetch(
//         "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBa86IKDswZ1Q7bPSs3U6f_kszZowXVNrk",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             contents: [{ parts: [{ text: fileContents + "\nQuestion: " + question }] }],
//           }),
//         }
//       );
//       const data = await response.json();
//       setAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini");
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to get response from Gemini",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   return (
//     <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-4xl mx-auto space-y-8">
//         <div className="text-center">
//           <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
//             File Upload & Gemini LLM
//           </h1>
//           <p className="mt-2 text-gray-600 dark:text-gray-400">
//             Upload your documents and ask questions about their contents
//           </p>
//         </div>

//         <FileUpload
//           onFilesProcessed={handleFilesProcessed}
//           maxFileSize={20 * 1024 * 1024} // 20MB
//           acceptedFileTypes={[".pdf", ".txt", ".doc", ".docx"]}
//         />

//         <Card className="p-6">
//           <div className="space-y-4">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//               Ask a Question
//             </label>
//             <div className="flex gap-4">
//               <Textarea
//                 placeholder="Enter your question about the documents..."
//                 value={question}
//                 onChange={(e) => setQuestion(e.target.value)}
//                 className="flex-1"
//               />
//               <Button
//                 onClick={askGemini}
//                 disabled={isLoading}
//                 className="self-start"
//               >
//                 {isLoading ? (
//                   "Processing..."
//                 ) : (
//                   <>
//                     Ask Gemini
//                     <Send className="ml-2 h-4 w-4" />
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>

//           {answer && (
//             <div className="space-y-2 mt-6">
//               <h3 className="font-medium text-gray-900 dark:text-gray-100">
//                 Gemini's Response
//               </h3>
//               <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
//                 <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
//                   {answer}
//                 </p>
//               </div>
//             </div>
//           )}
//         </Card>
//       </div>
//     </main>
//   );
// }


































"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile } from "@/lib/types";

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFilesProcessed = (processedFiles: UploadedFile[]) => {
    setFiles(processedFiles);
  };

  async function askGemini() {
    if (!files.length) {
      toast({
        title: "No files processed",
        description: "Please upload and process files first",
        variant: "destructive",
      });
      return;
    }

    if (!question.trim()) {
      toast({
        title: "No question provided",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fileContents = files.map(file => file.content).join("\n\n");
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBa86IKDswZ1Q7bPSs3U6f_kszZowXVNrk",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fileContents + "\nQuestion: " + question }] }],
          }),
        }
      );
      const data = await response.json();
      setAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response from Gemini",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            File Upload & Gemini LLM
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload your documents and ask questions about their contents
          </p>
        </div>

        <FileUpload
          onFilesProcessed={handleFilesProcessed}
          maxFileSize={20 * 1024 * 1024} // 20MB
          acceptedFileTypes={[".pdf", ".txt", ".doc", ".docx"]}
        />

        <Card className="p-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ask a Question
            </label>
            <div className="flex gap-4">
              <Textarea
                placeholder="Enter your question about the documents..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={askGemini}
                disabled={isLoading}
                className="self-start"
              >
                {isLoading ? "Processing..." : "Ask Gemini"}
              </Button>
            </div>
          </div>

          {answer && (
            <div className="space-y-2 mt-6">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Gemini's Response
              </h3>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {answer}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}