import React from "react";
import { motion } from "framer-motion";
import { useAuthSync } from "./useAuthSync";
import { useUIStore } from "../stores/uiStore";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authReady } = useAuthSync();
  const { _hasHydrated } = useUIStore();

  if (!authReady || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-theme-bg-deep flex items-center justify-center relative overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[800px] h-[800px] bg-theme-primary/10 rounded-full blur-[120px]"
        />
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 border-t-2 border-r-2 border-theme-primary rounded-full mb-8"
          />
          <h1 className="font-display text-2xl tracking-[0.3em] uppercase theme-gradient mb-2">
            Aura_OS
          </h1>
          <p className="font-mono text-xs text-theme-primary/50 tracking-widest uppercase">
            Initialisation système...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
