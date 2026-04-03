import React from "react";
import { Terminal, Send, RotateCcw } from "lucide-react";
import { User } from "firebase/auth";
import type { Persona } from "@/types";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  user: User | null;
  currentChat: any;
  isGenerating: boolean;
  onRestartSequence: () => void;
}

export const ChatInput = ({
  input,
  setInput,
  onSubmit,
  user,
  currentChat,
  isGenerating,
  onRestartSequence
}: ChatInputProps) => {
  return (
    <div className="p-4 sm:p-6 bg-gradient-to-t from-theme-bg via-theme-bg/90 to-transparent z-10 flex flex-col items-center">
      <form onSubmit={onSubmit} className="relative w-full max-w-4xl">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Terminal className="w-4 h-4 text-theme-primary/50" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!user || !currentChat || isGenerating}
          placeholder={
            user
              ? currentChat?.selectedPersona
                ? `Parler à ${currentChat.selectedPersona.name}...`
                : "Entrez votre requête pour initialiser la séquence S1..."
              : "Authentification requise"
          }
          className="w-full bg-theme-bg/80 backdrop-blur-xl border border-theme-primary/30 rounded-2xl py-4 pl-12 pr-14 text-theme-primary-light font-sans text-sm focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 placeholder:text-theme-primary/30 disabled:opacity-50 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        />
        <button
          type="submit"
          disabled={!input.trim() || !user || !currentChat || isGenerating}
          className="absolute inset-y-2 right-2 flex items-center justify-center w-10 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary rounded-xl disabled:opacity-50 disabled:hover:bg-theme-primary/10 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      <div className="w-full max-w-4xl mt-3 flex justify-between items-center px-2">
        <span className="font-mono text-[9px] text-theme-primary/30 uppercase tracking-widest">
          Aura_OS // Secure Connection
        </span>
        <button
          onClick={onRestartSequence}
          disabled={!user || isGenerating}
          className="flex items-center space-x-1.5 text-theme-primary/40 hover:text-theme-primary transition-colors font-mono text-[9px] uppercase tracking-widest disabled:opacity-50"
          title="Redémarrer la séquence S1 (Nouvelle session)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
