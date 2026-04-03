import React, { useState, useEffect, useRef } from 'react';
import { Glass } from '@/ui/Glass';
import { Bot, Send, Loader2, User as UserIcon, HelpCircle } from 'lucide-react';
import { DynamicIcon } from './DynamicIcon';
import { AIService } from '@/services/ai/AIService';
import type { Persona } from '@/types';
import ReactMarkdown from 'react-markdown';

interface DebateViewProps {
  favorites: Record<string, Persona>;
  userId: string;
}

export const DebateView = ({ favorites, userId }: DebateViewProps) => {
  const [input, setInput] = useState('');
  const [personaA, setPersonaA] = useState<Persona | null>(null);
  const [personaB, setPersonaB] = useState<Persona | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [messages, setMessages] = useState<{
    id: string;
    role: 'user' | 'model';
    contentA?: string;
    contentB?: string;
    content?: string;
  }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !personaA || !personaB || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    setIsGenerating(true);

    const newMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMsgId, role: 'user', content: userMessage }]);

    try {
      // Create a temporary message for the streaming responses
      const responseMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: responseMsgId, role: 'model', contentA: '', contentB: '' }]);

      const history = messages.map(m => ({
        id: m.id,
        chatId: 'debate',
        userId: userId,
        role: m.role as 'user' | 'model',
        content: m.role === 'user' ? (m.content || '') : `[${personaA.name}]: ${m.contentA}\n[${personaB.name}]: ${m.contentB}`,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      }));

      const [streamA, streamB] = AIService.streamDebate(
        userMessage,
        personaA,
        personaB,
        {}, // empty memory
        history,
        userId
      );

      // Process streams concurrently
      const processStream = async (stream: AsyncGenerator<string>, personaKey: 'contentA' | 'contentB') => {
        for await (const chunk of stream) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === responseMsgId) {
              return { ...msg, [personaKey]: (msg[personaKey] || '') + chunk };
            }
            return msg;
          }));
        }
      };

      await Promise.all([
        processStream(streamA, 'contentA'),
        processStream(streamB, 'contentB')
      ]);

    } catch (error) {
      console.error('Debate error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const favoritePersonas: Persona[] = Object.values(favorites);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header / Persona Selection */}
      <div className="p-4 border-b border-theme-primary/20 flex gap-4">
        <div className="flex-1">
          <label className="block font-mono text-xs text-theme-primary mb-1">Persona A</label>
          <select 
            className="w-full bg-theme-bg border border-theme-primary/30 text-theme-primary p-2 font-mono text-sm"
            onChange={(e) => setPersonaA(favoritePersonas.find(p => p.name === e.target.value) || null)}
            value={personaA?.name || ''}
          >
            <option value="">Sélectionner un favori...</option>
            {favoritePersonas.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block font-mono text-xs text-theme-primary mb-1">Persona B</label>
          <select 
            className="w-full bg-theme-bg border border-theme-primary/30 text-theme-primary p-2 font-mono text-sm"
            onChange={(e) => setPersonaB(favoritePersonas.find(p => p.name === e.target.value) || null)}
            value={personaB?.name || ''}
          >
            <option value="">Sélectionner un favori...</option>
            {favoritePersonas.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-theme-primary/50 font-mono text-sm">
            Sélectionnez deux personas et lancez un sujet de débat.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-center' : 'items-stretch'}`}>
              {msg.role === 'user' ? (
                <Glass level="l1" className="max-w-[80%] p-4 rounded-xl mb-4">
                  <div className="flex items-center justify-center space-x-2 mb-2 text-theme-primary-light/70">
                    <UserIcon className="w-4 h-4" />
                    <span className="font-mono text-xs uppercase">Sujet de Débat</span>
                  </div>
                  <p className="font-mono text-theme-text-light text-sm text-center">{msg.content}</p>
                </Glass>
              ) : (
                <div className="flex gap-4 w-full">
                  {/* Persona A Response */}
                  <Glass level="l2" className="flex-1 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-2 text-theme-primary-light/70 border-b border-theme-primary/20 pb-2">
                      <div className="w-6 h-6 rounded bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                        <DynamicIcon 
                          name={personaA?.icon || "Bot"} 
                          size={14} 
                          className="text-theme-primary" 
                        />
                      </div>
                      <span className="font-mono text-xs uppercase font-bold">{personaA?.name}</span>
                    </div>
                    <div className="prose prose-invert prose-sm prose-p:font-mono prose-p:text-theme-text-light/90">
                      <ReactMarkdown>{msg.contentA || ''}</ReactMarkdown>
                    </div>
                  </Glass>
                  
                  {/* Persona B Response */}
                  <Glass level="l2" className="flex-1 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-2 text-theme-primary-light/70 border-b border-theme-primary/20 pb-2">
                      <div className="w-6 h-6 rounded bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                        <DynamicIcon 
                          name={personaB?.icon || "Bot"} 
                          size={14} 
                          className="text-theme-primary" 
                        />
                      </div>
                      <span className="font-mono text-xs uppercase font-bold">{personaB?.name}</span>
                    </div>
                    <div className="prose prose-invert prose-sm prose-p:font-mono prose-p:text-theme-text-light/90">
                      <ReactMarkdown>{msg.contentB || ''}</ReactMarkdown>
                    </div>
                  </Glass>
                </div>
              )}
            </div>
          ))
        )}
        {isGenerating && (
          <div className="flex justify-center text-theme-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <Glass level="l3" className="p-4 border-t border-theme-primary/30 rounded-none">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Lancer un sujet de débat..."
            disabled={isGenerating || !personaA || !personaB}
            className="w-full bg-theme-bg/50 border border-theme-primary/50 text-theme-primary-light font-mono text-sm px-4 py-3 focus:outline-none focus:border-theme-primary-light focus:ring-1 focus:ring-theme-primary-light transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim() || !personaA || !personaB}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-theme-primary hover:text-theme-primary-light disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </Glass>
    </div>
  );
};
