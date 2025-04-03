export const generateChatTitle = async (fileName: string, content: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const prompt = `Generate a concise title for a chat about ${fileName}. Content snippet: ${content.slice(
      0,
      500
    )}. Return only the title.`;
  
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "New Chat";
  };
  
  export const generateChatResponse = async (context: string, question: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    try {
      // Generate search query from context and question
      const searchQuery = await generateSearchQuery(context, question);
  
      // Fetch Google Search results
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY}&cx=${process.env.NEXT_PUBLIC_GOOGLE_CSE_ID}&q=${encodeURIComponent(searchQuery)}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
  
      // Process search results
      let searchContext = "";
      if (searchData?.items?.length > 0) {
        searchContext = searchData.items.slice(0, 3).map((item: any) => 
          `• [${item.title}](${item.link}): ${item.snippet}`
        ).join("\n");
      }
      console.log(searchContext);
      // Build enhanced prompt
      const prompt = `**Context**: 
  ${context}
  
  **Web Search Results** (query: "${searchQuery}"):
  ${searchContext || "No relevant web results found"}
  
  **Question**: ${question}
  
  **Instructions**:
  1. Ground your response in both the context and web search results
  2. Keep answers concise but comprehensive
  3. Do not mention any backend activities like searching websites, etc. No need to cite. Just use the context.
  4. Act like a human, talk like a human. Do not say things like "Context mentions this","Web Results Mention that".
  5. Do not use any formatting like markdown. Seperate lines properly by using new lines.`
  
  
      // Generate response with Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          }),
        }
      );
  
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
      
    } catch (error) {
      console.error("Search-enhanced response failed:", error);
      // Fallback to basic response without search
      return await generateAnswer(`${context}\nQuestion: ${question}`);
    }
  };
  
  export const extractQuestionsFromText = async (content: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const prompt = `Extract and list all individual questions/tasks from this text exactly as they appear. Remember questions may not be direct. They might be long or descriptive as well, stating a task. Return only the questions numbered in markdown format:\n\n${content.slice(
      0,
      3000
    )}`;
  
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  
    const data = await response.json();
    console.log("Extracted Questions:"+data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Extracted Questions:"+text);
    return text
      .split("\n")
      .filter((line: string) => /^\d+\./.test(line))
      .map((q: string) => q.replace(/^\d+\.\s*/, ""));
  };
  
  export const generateSearchQuery = async (context: string, question: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const prompt = `Given the following conversation context:
  ${context}
  
  Generate an effective Google search query to find detailed and accurate information for answering the question:
  ${question}
  
  Return only the search query text.`;
  
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || question;
  };
  
  export const generateAnswer = async (prompt: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer available"
    );
  };

  export const generateAnswerWithWebSearch = async (
    context: string,
    question: string
  ) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    try {
      // Generate search query
      const searchQuery = await generateSearchQuery(context, question);
        
      // Query Google Custom Search
      const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY}&cx=${process.env.NEXT_PUBLIC_GOOGLE_CSE_ID}&q=${encodeURIComponent(searchQuery)}`;
      const googleResponse = await fetch(googleSearchUrl);
      const googleData = await googleResponse.json();
  
      // Process search results
      let searchResultsContext = "";
      if (googleData?.items) {
        searchResultsContext = googleData.items
          .slice(0, 3)
          .map((item: any) => `${item.title}: ${item.snippet}`)
          .join("\n\n");
      }

      console.log("Google Results Context");
      console.log(searchResultsContext);
  
      // Build enriched context
      const fullContext = `${context}\n\nAdditional Context from Google Search (query used: "${searchQuery}"):\n${searchResultsContext}`;
  
      // Construct final prompt
      const prompt = `You are a helpful homework solver. Solve the question using the context below. Do NOT include pleasantries - go straight to the answer. Provide full sentences. Do not use any formatting like markdown. Seperate lines properly by using new lines.
      
  Context:
  ${fullContext}
  
  Question:
  ${question}`;
  
      // Get answer from Gemini
      return generateAnswer(prompt);
    } catch (error) {
      console.error("Search-enhanced answer generation failed:", error);
      return "Failed to generate answer with web search";
    }
  };

  // Add these new functions to gemini.ts
export const generateChatResponseWithoutSearch = async (context: string, question: string) => {
  console.log("Without Search");
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const prompt = `**Context**: 
${context}

**Question**: ${question}

**Instructions**:
1. Ground your response in the provided context
2. Keep answers concise but comprehensive
3. Answer directly without mentioning that you're using the context
Do not use any formatting like markdown. Seperate lines properly by using new lines.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
};

export const generateAnswerWithoutSearch = async (context: string, question: string) => {
  console.log("Without Search");
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const prompt = `You are a helpful homework solver. Solve the question using ONLY the context below. Do NOT include pleasantries - go straight to the answer. Provide full sentences. Do not use any formatting like markdown. Seperate lines properly by using new lines..
  
Context:
${context}

Question:
${question}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer available";
};