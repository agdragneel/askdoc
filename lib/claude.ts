const callClaude = async (prompt: string) => {
  if (!prompt.trim()) return "No input provided";

  try {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CLAUDE_API_KEY}`,
      },
      body: JSON.stringify({ message: prompt }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.reply || "No response generated";
  } catch (err) {
    console.error(err);
    return "Error: Failed to get response from Claude.";
  }
};

export const generateChatTitle = async (fileName: string, content: string) => {
  const prompt = `Create a concise title for a discussion about ${fileName}. Here's a snippet: ${content.slice(
    0,
    500
  )}. Provide only the title. Make the title intuitive.`;
  return await callClaude(prompt);
};

export const generateSearchQuery = async (
  context: string,
  question: string
) => {
  const prompt = `Create an effective Google search query for the question: ${question}`;
  return await callClaude(prompt);
};

export const generateChatResponse = async (
  context: string,
  question: string
) => {
  try {
    const searchQuery = await generateSearchQuery(context, question);

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${
      process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY
    }&cx=${process.env.NEXT_PUBLIC_GOOGLE_CSE_ID}&q=${encodeURIComponent(
      searchQuery
    )}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    let searchContext = "";
    if (searchData?.items?.length > 0) {
      searchContext = searchData.items
        .slice(0, 3)
        .map((item: any) => `• ${item.title}: ${item.snippet}`)
        .join("\n");
    }

    const prompt = `You are a student solving an academic assignment. Provide a precise response to:
    
    Question: ${question}
    Context: ${context}
    Additional Information: ${searchContext || "None"}
    
    Requirements:
    - Use formal academic language
    - Maintain perfect formatting
    - Do not mention sources or research methods
    - Present complete answers without disclaimers
    - Format data appropriately using markdown (tables when needed)
    - Never reference any tools or AI
    - Do not say things that can give away you are an AI, like "According to the Supplementary Inforamtion", or  "The supplementary information appears unrelated to the .."
    -Do not include information that is not relevant. If asked short questions, answer in short.
    .`;

    return await callClaude(prompt);
  } catch (error) {
    console.error("Claude with search failed:", error);
    return await generateChatResponseWithoutSearch(context, question);
  }
};

export const generateChatResponseWithoutSearch = async (
  context: string,
  question: string
) => {
  const prompt = `You are a student completing an academic assignment. Compose a professional response to:
  
  Question: ${question}
  Relevant Information: ${context}
  
  Guidelines:
  - Answer directly and completely
  - Use precise academic language
  - Format perfectly using markdown (tables, paragraphs, etc.)
  - Do not include any non-student identifiers
  - Present as factual without methodological explanations
  - Never use phrases like "based on research"
  - Do not say things that can give away you are an AI, like "According to the Supplementary Inforamtion", or  "The supplementary information appears unrelated to the .."
  -Do not include information that is not relevant. If asked short questions, answer in short.`;

  return await callClaude(prompt);
};

export const generateAnswer = async (prompt: string) => {
  return await callClaude(prompt);
};

export const generateAnswerWithoutSearch = async (
  context: string,
  question: string
) => {
  const prompt = `You are a student solving an academic assignment. Provide a complete answer to:
  
  Question: ${question}
  Context: ${context}
  
  Requirements:
  - Use professional academic tone
  - Present information authoritatively
  - Format all data perfectly
  - Do not reference any tools or processes
  - Answer only what is asked
  - Never indicate non-student origin
  - Maintain consistent formal style
  - Do not say things that can give away you are an AI, like "According to the Supplementary Inforamtion", or  "The supplementary information appears unrelated to the .."
  -Do not include information that is not relevant. If asked short questions, answer in short.`;

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

    const prompt = `You are a student completing academic work. Compose a thorough response to:
    
    Question: ${question}
    Course Materials: ${context}
    Additional References: ${searchContext}
    
    Instructions:
    - Synthesize information professionally
    - Present as authoritative academic work
    - Use perfect formatting and structure
    - Do not mention information sources
    - Never indicate external research was conducted
    - Maintain student perspective consistently
    - Do not say things that can give away you are an AI, like "According to the Supplementary Inforamtion", or  "The supplementary information appears unrelated to the .."
    -Do not include information that is not relevant. If asked short questions, answer in short.`;

    return await callClaude(prompt);
  } catch (error) {
    console.error("Claude w/ search failed:", error);
    return "Failed to generate answer with web search";
  }
};

export const extractQuestionsFromText = async (content: string) => {
  const prompt = `Extract and list all individual questions/tasks from this text exactly as they appear. Return only the questions, numbered (1. ... 2. ...) with no markdown:\n\n${content.slice(
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
  const prompt = `Analyze this assignment text and extract any specific guidelines or instructions for answering questions. Focus on formatting rules, citation requirements, length restrictions, methods, or grading criteria. Return as bullet points, or say "No specific guidelines provided."\n\n${content.slice(
    0,
    3000
  )}`;
  return await callClaude(prompt);
};

export const extractAssignmentContext = async (content: string) => {
  const prompt = `Analyze this assignment text and extract any background information or key reference material useful for solving questions. Look for datasets, theorems, examples, or case details. Return as bullet points, or say "No additional context provided."\n\n${content.slice(
    0,
    3000
  )}`;
  return await callClaude(prompt);
};