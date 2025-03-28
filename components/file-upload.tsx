"use client";

import { useState, useCallback } from "react";
import { FileWithPreview, UploadedFile } from "@/lib/types";
import { formatFileSize, generateId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, X, Loader2, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onFilesProcessed: (files: UploadedFile[]) => void;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
}

export function FileUpload({
  onFilesProcessed,
  maxFileSize = 20 * 1024 * 1024, // 20MB default
  acceptedFileTypes = [".pdf", ".txt", ".doc", ".docx"],
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds the ${formatFileSize(maxFileSize)} limit`,
        variant: "destructive",
      });
      return false;
    }

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a supported file type`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(validateFile);
      setFiles((prev) => [...prev, ...validFiles]);
    },
    [maxFileSize]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(validateFile);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (fileToRemove: FileWithPreview) => {
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  const processFiles = async () => {
    if (!files.length) {
      toast({
        title: "No files selected",
        description: "Please select files to process",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    const processedFiles: UploadedFile[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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

        setProgress(((i + 1) / totalFiles) * 100);
      }

      onFilesProcessed(processedFiles);
      toast({
        title: "Files processed successfully",
        description: `Processed ${files.length} file(s)`,
      });
      setFiles([]);
    } catch (error) {
      toast({
        title: "Error processing files",
        description: "An error occurred while processing the files",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async function () {
        try {
          // @ts-ignore
          const pdf = await window.pdfjsLib.getDocument({ data: reader.result }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(" ") + " ";
          }
          resolve(text.trim());
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
    });
  };

  const extractTextFromTextOrDoc = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };


  // -------------------------------HTML Part--------------------------------------------------------------------//
  return (
    <Card className="p-6">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          processing ? "opacity-50" : "hover:border-primary cursor-pointer"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={acceptedFileTypes.join(",")}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={processing}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <FileUp className="h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop files here, or click to select files
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Maximum file size: {formatFileSize(maxFileSize)}
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file)}
                disabled={processing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {processing && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center mt-2">Processing files...</p>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button
              onClick={processFiles}
              disabled={processing}
              className="w-full sm:w-auto"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Files"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}