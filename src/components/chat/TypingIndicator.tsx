import React from "react";
import { Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Glass } from "../../ui/Glass";

const NeuralWaveform = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-end gap-1 h-4 px-2">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        animate={isActive ? { height: [4, 16, 8, 12, 4] } : { height: 4 }}
        transition={{
          repeat: Infinity,
          duration: 0.5 + i * 0.1,
          ease: "easeInOut",
        }}
        className="w-1 bg-theme-primary rounded-full opacity-60"
      />
    ))}
  </div>
);

interface TypingIndicatorProps {
  personaName?: string;
  personaTone?: string;
  streamingMessage: string | null;
  isGenerating: boolean;
  isS1: boolean;
}

export const TypingIndicator = ({
  personaName,
  personaTone,
  streamingMessage,
  isGenerating,
  isS1
}: TypingIndicatorProps) => {
  if (streamingMessage !== null) {
    return (
      <div className="flex flex-col items-start">
        <Glass
          level="l2"
          className="max-w-[85%] sm:max-w-[75%] p-6 rounded-3xl rounded-tl-sm border-theme-primary/40 shadow-[0_4px_24px_rgba(var(--color-primary-rgb),0.15)]"
        >
          <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-theme-primary/10 text-theme-primary-light">
            <div className="w-8 h-8 rounded-full bg-theme-primary/30 flex items-center justify-center border border-theme-primary/50 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)] animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold uppercase tracking-widest">
                {personaName || "Aura_OS"}
              </span>
              <span className="font-mono text-[9px] text-theme-primary/50 uppercase tracking-tighter">
                {personaTone || "System"}
              </span>
            </div>
            <div className="ml-auto">
              <NeuralWaveform isActive={true} />
            </div>
          </div>
          <div className="prose prose-invert prose-sm prose-p:font-sans prose-p:text-theme-text-light/90 prose-p:leading-relaxed max-w-none">
            <ReactMarkdown>{streamingMessage + " █"}</ReactMarkdown>
          </div>
        </Glass>
      </div>
    );
  }

  if (isGenerating && streamingMessage === null) {
    return (
      <div className="flex items-start space-x-4">
        <div className="flex items-center space-x-2 text-theme-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest animate-pulse">
            {!isS1
              ? `Analyse par ${personaName} en cours...`
              : "Génération des personas en cours..."}
          </span>
        </div>
      </div>
    );
  }

  return null;
};
