export const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async function () {
        try {
          // @ts-ignore - PDF.js types
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

  export const extractTextFromTextOrDoc = async (file: File): Promise<string> => {
    try {
      // Handle DOCX files
      if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }
      
      // Handle text files and legacy Word docs
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
    } catch (error) {
      console.error("Error extracting text:", error);
      throw new Error("Failed to extract text from file");
    }
  };