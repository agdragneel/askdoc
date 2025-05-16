const generatePlainPDF = async (markdown: string): Promise<Blob> => {
    // 1. Strip out markdown syntax
    const text = removeMarkdown(markdown);
  
    // 2. Set up jsPDF for A4
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
    // Margins
    const margin = 10; // mm
    const maxLineWidth = pageWidth - margin * 2;
    const lineHeight = 7; // mm per line
    let cursorY = margin;
  
    // 3. Split into lines that fit the width
    const lines = doc.splitTextToSize(text, maxLineWidth);
  
    // 4. Render line by line, adding pages as needed
    for (const line of lines) {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    }
  
    // 5. Output as Blob
    return doc.output("blob");
  };

const generateDOCX = async (text: string): Promise<Blob> => {
    // Remove all markdown formatting from the input text
    const cleanedText = removeMarkdown(text);
    
    // Split the cleaned text into paragraphs by two newline characters
    const paragraphs = cleanedText.split("\n\n").map((content) =>
      new Paragraph({
        children: [new TextRun(content)],
        spacing: { after: 200 },
      })
    );
  
    // Create the document with the generated paragraphs
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });
  
    // Return the DOCX blob
    return Packer.toBlob(doc);
  };