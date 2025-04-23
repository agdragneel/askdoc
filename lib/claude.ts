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
  const prompt = `Create a concise title for a discussion about ${fileName}. Here’s a snippet: ${content.slice(
    0,
    500
  )}. Provide only the title.`;
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

    const prompt = `Here is some information:\n${context}\n\nAdditional details:\n${
      searchContext || "No additional information available"
    }\n\nQuestion: ${question}\n\nAnswer directly, as if you were a student completing homework. Do not mention any sources or where the information came from. Keep it concise and in plain text.`;

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
  const prompt = `Here is some information:\n${context}\n\nQuestion: ${question}\n\nAnswer directly, as if you were a student completing homework. Do not mention any sources or where the information came from. Keep it concise and in plain text.`;
  return await callClaude(prompt);
};

export const generateAnswer = async (prompt: string) => {
  return await callClaude(prompt);
};

export const generateAnswerWithoutSearch = async (
  context: string,
  question: string
) => {
  const prompt = `You are a student solving an assignment. Answer the following question using the information provided. Go straight to the answer without pleasantries or extra formatting. Do not mention any sources.\n\n${context}\n\nQuestion: ${question}`;
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

    const prompt = `Here is some information:\n${context}\n\nAdditional details:\n${searchContext}\n\nQuestion: ${question}\n\nAnswer directly, as if you were a student. Do not mention any sources or search processes. Provide a clear, concise response in plain text.`;

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
