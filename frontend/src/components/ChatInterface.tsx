'use client';

import {useState} from 'react';
import {Send, Image as ImageIcon} from 'lucide-react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {role: 'assistant', content: "Welcome to 0buck! I'm your AI shopping assistant. Send me a picture or describe what you're looking for."}
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, {role: 'user', content: input}]);
    setInput('');
    // TODO: Connect to backend AI agent
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="p-4 bg-white border-b flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600">0buck AI</h1>
        <div className="text-sm text-gray-500">Global Cloud Powered</div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </main>

      {/* Input */}
      <footer className="p-4 bg-white border-t">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
          <button className="text-gray-500 hover:text-blue-600">
            <ImageIcon size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Search products or ask anything..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="text-blue-600">
            <Send size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
