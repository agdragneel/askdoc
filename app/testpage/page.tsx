'use client';

import React, { useState } from 'react';

export default function TestPage() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
  
    setLoading(true);
    setResponse('');
  
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });
  
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data.reply);
    } catch (err) {
      console.error(err);
      setResponse('Error: Failed to get response from Claude.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Claude API Test Page</h1>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={5}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message here..."
      />
      <button
        onClick={handleSend}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Sending...' : 'Send to Claude'}
      </button>
      {response && (
        <div className="mt-4 p-4 border rounded bg-gray-100 whitespace-pre-wrap">
          <strong>Claude's Response:</strong>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
