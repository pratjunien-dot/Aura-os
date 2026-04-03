import React from "react";
import { Glass } from "@/ui/Glass";

export const GlassSkeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <Glass
      level="l2"
      className={`animate-pulse bg-theme-primary/10 border-theme-primary/20 ${className}`}
    >
      <div className="h-full w-full rounded-sm bg-theme-primary/5"></div>
    </Glass>
  );
};
