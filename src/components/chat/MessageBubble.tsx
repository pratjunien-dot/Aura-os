import React from "react";
import { User as UserIcon, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Glass } from "../../ui/Glass";
import { CopyButton } from "../../ui/CopyButton";

interface MessageBubbleProps {
  role: "user" | "model";
  content: string;
  personaName?: string;
  personaTone?: string;
}

export const MessageBubble = ({ role, content, personaName, personaTone }: MessageBubbleProps) => {
  if (role === "user") {
    return (
      <Glass
        level="l2"
        className="max-w-[85%] sm:max-w-[75%] p-5 rounded-3xl rounded-tr-sm bg-theme-primary/10 border-theme-primary/30 shadow-[0_4px_20px_rgba(var(--color-primary-rgb),0.15)]"
      >
        <div className="flex items-center justify-end space-x-2 mb-3 text-theme-primary-light/70">
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
            User_Input
          </span>
          <UserIcon className="w-4 h-4" />
        </div>
        <p className="font-sans text-theme-text-light text-[15px] leading-relaxed whitespace-pre-wrap text-right">
          {content}
        </p>
      </Glass>
    );
  }

  return (
    <Glass
      level="l2"
      className="max-w-[85%] sm:max-w-[75%] p-6 rounded-3xl rounded-tl-sm border-theme-primary/40 shadow-[0_4px_24px_rgba(var(--color-primary-rgb),0.1)]"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-theme-primary/10">
        <div className="flex items-center space-x-3 text-theme-primary-light">
          <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center border border-theme-primary/30 shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.2)]">
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
        </div>
        <CopyButton text={content} />
      </div>
      <div className="prose prose-invert prose-sm prose-p:font-mono prose-p:text-theme-text-light/90 prose-p:leading-relaxed max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </Glass>
  );
};
