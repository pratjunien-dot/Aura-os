import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: React.ReactNode;
}

/**
 * DynamicIcon — Rendu dynamique d'une icône Lucide par son nom, 
 * ou affichage d'un emoji si le nom ne correspond pas à une icône.
 */
export const DynamicIcon = ({ name, fallback, ...props }: DynamicIconProps) => {
  // 1. Vérifier si c'est une icône Lucide
  const IconComponent = (LucideIcons as any)[name];

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  // 2. Si ce n'est pas une icône Lucide, on traite comme du texte (emoji)
  // On vérifie si c'est un emoji simple ou une chaîne courte
  if (name && name.length <= 4) {
    return <span style={{ fontSize: props.size || 24 }}>{name}</span>;
  }

  // 3. Fallback par défaut
  if (fallback) return <>{fallback}</>;

  // Icône par défaut si rien ne correspond
  return <LucideIcons.HelpCircle {...props} />;
};
