export interface FileWithPreview extends File {
  preview?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
}

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  attachments?: {
    type: string;
    data: string;
    name: string;
  }[];
};

export type Chat = {
  id: string;
  created_at: string;
  title: string;
  files: string;
  user_id: string;
};