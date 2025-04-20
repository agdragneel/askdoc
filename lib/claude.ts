const callClaude = async (prompt: string) => {
    if (!prompt.trim()) return "No input provided";
    
    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CLAUDE_API_KEY}`,
        },
        body: JSON.stringify({ message: prompt }),
      });
  
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.reply || "No response generated";  // Adjust based on Claude's response format
    } catch (err) {
      console.error(err);
      return "Error: Failed to get response from Claude.";
    }
  };

export const generateChatTitle = async (fileName: string, content: string) => {
  const prompt = `Generate a concise title for a chat about ${fileName}. Content snippet: ${content.slice(
    0,
    500
  )}. Return only the title.`;
  console.log("Chat Title Generated Successfully by Claude");
  return await callClaude(prompt);
};

export const generateSearchQuery = async (
  context: string,
  question: string
) => {
  const prompt = `Given the following conversation context:\n${context}\n\nGenerate an effective Google search query to find detailed and accurate information for answering the question:\n${question}\n\nReturn only the search query text.`;
  return await callClaude(prompt);
};

export const generateChatResponse = async (context: string, question: string) => {
    try {
      const searchQuery = await generateSearchQuery(context, question);
  
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${
        process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY
      }&cx=${process.env.NEXT_PUBLIC_GOOGLE_CSE_ID}&q=${encodeURIComponent(searchQuery)}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
  
      let searchContext = "";
      if (searchData?.items?.length > 0) {
        searchContext = searchData.items
          .slice(0, 3)
          .map((item: any) => `• ${item.title}: ${item.snippet}`)
          .join("\n");
      }
  
      const prompt = `Context:\n${context}\n\nWeb Search Results (query: "${searchQuery}"):\n${
        searchContext || "No relevant web results found"
      }\n\nQuestion: ${question}\n\nInstructions:\n1. Ground your response in both the context and web search results.\n2. Keep answers concise but comprehensive.\n3. Do not mention the context or results explicitly.\n4. Avoid markdown. Use plain text.\n5. Act natural.`;
  
      // Call Claude with the complete prompt
      const chatResponse = await callClaude(prompt);
      console.log("Claude response:", chatResponse); // Check the raw Claude response
  
      return chatResponse || "Failed to generate a response"; // In case Claude's response is empty
    } catch (error) {
      console.error("Claude with search failed:", error);
      return await generateChatResponseWithoutSearch(context, question);
    }
  };

export const generateChatResponseWithoutSearch = async (
  context: string,
  question: string
) => {
  const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nInstructions:\n1. Base your response only on the context.\n2. Be concise yet informative.\n3. No mention of context or formatting. Just a clean, natural response.`;
  return await callClaude(prompt);
};

export const generateAnswer = async (prompt: string) => {
  return await callClaude(prompt);
};

export const generateAnswerWithoutSearch = async (
  context: string,
  question: string
) => {
  const prompt = `You are a helpful homework solver. Solve the question using ONLY the context below. Go straight to the answer without pleasantries. Avoid formatting. Use plain new lines.\n\nContext:\n${context}\n\nQuestion:\n${question}`;
  return await callClaude(prompt);
};

export const generateAnswerWithWebSearch = async (
  context: string,
  question: string
) => {
  try {
    const searchQuery = await generateSearchQuery(context, question);
    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${
      process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY
    }&cx=${process.env.NEXT_PUBLIC_GOOGLE_CSE_ID}&q=${encodeURIComponent(
      searchQuery
    )}`;
    const response = await fetch(googleUrl);
    const data = await response.json();

    let searchContext = "";
    if (data?.items) {
      searchContext = data.items
        .slice(0, 3)
        .map((item: any) => `${item.title}: ${item.snippet}`)
        .join("\n\n");
    }

    const fullPrompt = `You are a helpful homework solver. Solve the question using the following context and additional info. No formatting. Just clean, separated text.\n\nContext:\n${context}\n\nExtra from Google Search:\n${searchContext}\n\nQuestion:\n${question}`;

    return await callClaude(fullPrompt);
  } catch (error) {
    console.error("Claude w/ search failed:", error);
    return "Failed to generate answer with web search";
  }
};

export const extractQuestionsFromText = async (content: string) => {
  const prompt = `Extract and list all individual questions/tasks from this text exactly as they appear. Some may be long or descriptive. Return only the questions, numbered (1. ... 2. ...) but no markdown:\n\n${content.slice(
    0,
    3000
  )}`;

  const raw = await callClaude(prompt);

  return raw
    .split("\n")
    .filter((line: string) => /^\d+\./.test(line))
    .map((line: string) => line.replace(/^\d+\.\s*/, ""));
};

export const extractAssignmentGuidelines = async (content: string) => {
  const prompt = `Analyze this assignment text and extract any specific guidelines/rubrics/instructions for answering questions.\nFocus on:\n- Formatting rules\n- Citation requirements\n- Length restrictions\n- Specific methods to use\n- Grading criteria\n\nReturn as bullet points. If none, say "No specific guidelines provided."\n\nAssignment:\n${content.slice(
    0,
    3000
  )}`;
  return await callClaude(prompt);
};

export const extractAssignmentContext = async (content: string) => {
  const prompt = `Analyze this assignment text and extract any background context or reference material useful for solving questions.\nLook for:\n- Datasets or examples\n- Theorems or formulas\n- Case study info\n- Key topics\n\nReturn as bullet points. If none, say "No additional context provided."\n\nAssignment:\n${content.slice(
    0,
    3000
  )}`;
  return await callClaude(prompt);
};
