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