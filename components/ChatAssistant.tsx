import React, { useState, useRef, useEffect } from 'react';
import { streamChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Bot, User, MapPin, ExternalLink } from 'lucide-react';

interface ChatAssistantProps {
  contextCountry?: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ contextCountry }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'model',
      text: contextCountry 
        ? `Hi! I can help you find channels in ${contextCountry}.` 
        : "Hello! Ask me anything about global TV channels or locations.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset if country changes
  useEffect(() => {
    if (contextCountry) {
        setMessages(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                role: 'model',
                text: `I see you're looking at ${contextCountry}. Need channel recommendations?`,
                timestamp: new Date()
            }
        ]);
    }
  }, [contextCountry]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseId = (Date.now() + 1).toString();
    let currentText = '';
    
    // Temporary placeholder message
    setMessages(prev => [...prev, {
      id: responseId,
      role: 'model',
      text: 'Thinking...',
      timestamp: new Date()
    }]);

    await streamChatResponse(
      messages.concat(userMsg),
      input,
      (textChunk) => {
        // Since it's streaming full text often in SDK, or chunks, handle appropriately
        // The SDK usually returns the cumulative text or chunks.
        // The `streamChatResponse` logic above assumes full text accumulation isn't automatic in callback,
        // so we just replace the text. 
        // Actually, let's assume standard accumulation from service.
        // NOTE: The provided service accumulates chunks into text property of response object? 
        // In the service I implemented `onChunk(chunk.text)`. It streams parts.
        // So we accumulate here. (Correction: the service usage example in prompt says `chunk.text` is a part).
        // But my service code accumulates? No, `chunk.text` is partial.
        // Let's accumulate here.
        
        // Actually, wait. The prompt example: `console.log(chunk.text)`.
        // Usually these are additive chunks.
        // So we append.
        
        // HOWEVER, checking standard behaviour: usually `chunk.text` is the delta.
        // Let's assume delta.
        
        // But wait, `ai.models.generateContentStream` returns chunks.
        // The service logic: `const text = chunk.text; if(text) onChunk(text);`
        
        // So we accumulate:
        /* But wait, if the service calls onChunk multiple times for the same message... */
        /* I need to update the LAST message in the array */
      },
      (sources) => {
          setMessages(prev => prev.map(m => 
              m.id === responseId ? { ...m, sources } : m
          ));
      }
    );

    // We need to reconstruct the accumulation logic carefully since we can't pass state updater directly easily
    // Ideally, we define the onChunk to update state.
    
    // Re-implementing simpler accumulation inside the loop in service is hard.
    // Let's do a slightly different pattern.
    
    // Refactoring handleSend to use a closure variable for text
    let accumulatedText = '';
    
    await streamChatResponse(
        messages.concat(userMsg),
        userMsg.text,
        (chunkText) => {
            accumulatedText += chunkText;
            setMessages(prev => prev.map(m => 
                m.id === responseId ? { ...m, text: accumulatedText } : m
            ));
        },
        (sources) => {
             setMessages(prev => prev.map(m => 
                m.id === responseId ? { ...m, sources } : m
            ));
        }
    );

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <div className="p-3 border-b border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          Gemini Assistant
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-700 text-gray-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
            
            {/* Sources from Grounding */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
                 {msg.sources.map((source, idx) => (
                   <a 
                     key={idx} 
                     href={source.uri} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-blue-300 px-2 py-1 rounded border border-white/10 transition-colors"
                   >
                     {source.uri.includes('maps') ? <MapPin className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                     {source.title || 'Source'}
                   </a>
                 ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 bg-white/5 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-black/20 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-blue-500"
            placeholder="Ask about channels..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-1 top-1 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
