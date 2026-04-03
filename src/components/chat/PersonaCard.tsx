import React from "react";
import { motion } from "framer-motion";
import { Star, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Glass } from "../../ui/Glass";
import { DynamicIcon } from "../shared/DynamicIcon";
import { CopyButton } from "../../ui/CopyButton";
import type { Persona } from "@/types";

interface PersonaCardProps {
  persona: Persona;
  content: string;
  isSelected: boolean;
  isGenerating: boolean;
  isFavorite: boolean;
  adjustments: Record<string, number>;
  onToggleFavorite: (persona: Persona) => void;
  onAdjust: (personaName: string, attributeKey: string, varianceIdx: number) => void;
  onRegenerate: () => void;
  onSelect: () => void;
  showSelectButton: boolean;
}

export const PersonaCard = ({
  persona,
  content,
  isSelected,
  isGenerating,
  isFavorite,
  adjustments,
  onToggleFavorite,
  onAdjust,
  onRegenerate,
  onSelect,
  showSelectButton
}: PersonaCardProps) => {
  return (
    <Glass
      level="l2"
      active={isSelected}
      shimmer
      className="flex flex-col overflow-hidden h-full"
    >
      {/* Persona Header */}
      <div
        className={`${isSelected ? "bg-theme-primary-dark/40" : "bg-theme-primary-darker/40"} border-b border-theme-primary/40 p-3`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
              <DynamicIcon 
                name={persona.icon || "Bot"} 
                size={18} 
                className="text-theme-primary" 
              />
            </div>
            <h3 className="font-mono font-bold text-theme-primary-light uppercase tracking-wider text-sm">
              {persona.name}
            </h3>
            <button
              onClick={() => onToggleFavorite(persona)}
              className="text-theme-primary hover:text-theme-primary/80 transition-colors focus:outline-none"
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Star
                className={`w-4 h-4 ${isFavorite ? "fill-theme-primary" : ""}`}
              />
            </button>
          </div>
          {isSelected && (
            <span className="font-mono text-[10px] bg-theme-primary text-black px-2 py-0.5 rounded-sm font-bold">
              ACTIF
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-y-2 mt-3">
          {persona.attributes && Object.entries(persona.attributes).map(([key, value]) => {
            const variances = Array.isArray(value) ? value : [value];
            return (
              <div key={key} className="flex flex-col space-y-1">
                <span className="font-mono text-[9px] text-theme-primary/40 uppercase tracking-tighter">
                  {key}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {variances.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdjust(persona.name, key, idx);
                      }}
                      className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] border transition-all ${
                        (adjustments[key] ?? 0) === idx 
                          ? "border-theme-primary/60 bg-theme-primary/20 text-theme-primary-light shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.3)]" 
                          : "border-theme-primary/10 bg-theme-primary/5 text-theme-primary/40 hover:border-theme-primary/30"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Response Content */}
      <div className="p-4 flex-1">
        <div className="prose prose-invert prose-sm prose-p:font-mono prose-p:text-theme-text-light/90 prose-p:leading-relaxed max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      {/* Signature & Actions */}
      <div className="bg-theme-primary-darker/20 border-t border-theme-primary/20 p-3 flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <CopyButton text={content} />
          {Object.keys(adjustments).length > 0 && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center space-x-1 font-mono text-[9px] text-theme-primary hover:text-theme-primary-light transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>RÉGÉNÉRER</span>
            </button>
          )}
          <span className="font-mono text-[10px] text-theme-primary/50 italic text-right">
            {persona.attributes?.signature || ''}
          </span>
        </div>
        {showSelectButton && (
          <button
            onClick={onSelect}
            className="w-full py-2 bg-theme-primary-dark/20 hover:bg-theme-primary/20 border border-theme-primary/50 text-theme-primary-light font-mono text-xs uppercase tracking-widest transition-colors"
          >
            Sélectionner ce persona
          </button>
        )}
      </div>
    </Glass>
  );
};
