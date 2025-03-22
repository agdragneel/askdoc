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