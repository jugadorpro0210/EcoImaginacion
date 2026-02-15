
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { chatWithAuthor } from '../services/geminiService';

interface ChatBotProps {
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await chatWithAuthor(messages, userMsg);
      setMessages(prev => [...prev, { role: 'model', text: response || 'No recibí respuesta.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, ocurrió un error al contactar al autor.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-50">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-violet-400">✦</span> Conversar con el Autor
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4 text-slate-500">
            <p className="text-sm">Pregunta sobre los personajes, el mundo o cómo continuar la historia.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-violet-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none border border-slate-700 px-4 py-2 text-xs italic animate-pulse">
              El autor está pensando...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="w-full bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-1 top-1 bg-violet-600 p-1.5 rounded-full hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBot;
