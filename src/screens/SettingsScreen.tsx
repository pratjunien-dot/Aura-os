import React, { useState, useEffect } from "react";
import { Glass } from "@/ui/Glass";
import { Palette, Cpu, Shield, Zap, HardDrive, LogOut, Activity, Monitor, Fingerprint, Loader2, RotateCcw } from "lucide-react";
import { DynamicIcon } from "../components/shared/DynamicIcon";
import { useUIStore } from "@/stores/uiStore";
import { motion } from "framer-motion";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";

const useDecrypt = (text: string, speed = 40) => {
  const [display, setDisplay] = useState("");
  const chars = "!<>-_\\/[]{}—=+*^?#________";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplay(
          (prev) =>
            text.substring(0, i) +
            chars[Math.floor(Math.random() * chars.length)],
        );
        i++;
      } else {
        setDisplay(text);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return display;
};

const AnimatedCounter = ({ value, duration = 1 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    let totalMiliseconds = duration * 1000;
    let incrementTime = (totalMiliseconds / end);

    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

export const SettingsView = () => {
  const {
    theme,
    setTheme,
    glassIntensity,
    setGlassIntensity,
    mode,
    setMode,
    presets,
    activePresetId,
    setActivePresetId,
    setPresets,
  } = useUIStore();

  const title = useDecrypt("RÉGLAGES SYSTÈME");
  const [activeSection, setActiveSection] = useState("appearance");

  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const sections = [
    { id: "appearance", icon: Palette, label: "Apparence" },
    { id: "presets", icon: Cpu, label: "Presets Persona" },
    { id: "system", icon: HardDrive, label: "Système" },
  ];

  return (
    <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-theme-bg/90 scrollbar-hide">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h2 className="font-display text-3xl theme-gradient uppercase tracking-[0.2em] mb-2 glitch-hover inline-block">
            {title}
          </h2>
          <div className="h-px w-full bg-gradient-to-r from-theme-primary/50 to-transparent" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  activeSection === section.id
                    ? "bg-theme-primary/20 text-theme-primary border-l-2 border-theme-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]"
                    : "text-theme-primary/40 hover:bg-theme-primary/5 hover:text-theme-primary/70"
                }`}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-mono text-xs uppercase tracking-widest">{section.label}</span>
              </button>
            ))}
            
            <div className="pt-8">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-all duration-300"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-mono text-xs uppercase tracking-widest">Déconnexion</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {activeSection === "appearance" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Glass level="l2" shimmer className="p-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <Monitor className="w-5 h-5 text-theme-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-widest text-theme-primary-light">Thèmes Visuels</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    {[
                      { id: "cyber", color: "#00f5d4", color2: "#0066ff", label: "Cyber" },
                      { id: "matrix", color: "#00ff88", color2: "#004422", label: "Matrix" },
                      { id: "cyberpunk", color: "#ffe600", color2: "#ff2d78", label: "Cyberpunk" },
                      { id: "neon", color: "#ff00ff", color2: "#00ffff", label: "Neon" },
                      { id: "emerald", color: "#10b981", color2: "#059669", label: "Emerald" },
                      { id: "sunset", color: "#ff5e00", color2: "#ff0055", label: "Sunset" },
                      { id: "deep-space", color: "#00e5ff", color2: "#1a237e", label: "Deep Space" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={`group relative p-4 border transition-all duration-500 overflow-hidden rounded-xl flex flex-col items-center justify-center gap-3 ${
                          theme === t.id 
                            ? "border-theme-primary bg-theme-primary/10 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.2)]" 
                            : "border-theme-primary/20 bg-theme-bg/40 hover:border-theme-primary/50 hover:bg-theme-primary/5"
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-125" 
                          style={{ 
                            background: `linear-gradient(135deg, ${t.color}, ${t.color2})`,
                            boxShadow: `0 0 15px ${t.color}66` 
                          }}
                        />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-theme-primary-light text-center">
                          {t.label}
                        </span>
                        {theme === t.id && (
                          <motion.div 
                            layoutId="theme-active"
                            className="absolute inset-0 border-2 border-theme-primary rounded-xl pointer-events-none"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </Glass>

                <Glass level="l2" className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-theme-primary" />
                      <h3 className="font-mono text-sm uppercase tracking-widest text-theme-primary-light">Moteur de Rendu</h3>
                    </div>
                    <span className="font-mono text-[10px] text-theme-primary/50 uppercase">v2.1.0-stable</span>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between p-4 border border-theme-primary/20 rounded-xl bg-theme-bg/40">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-theme-primary uppercase">Mode d'affichage</span>
                        <span className="font-mono text-[10px] text-theme-primary/40">Clair, Sombre ou OLED</span>
                      </div>
                      <div className="flex space-x-2">
                        {['light', 'dark', 'oled'].map((m) => (
                          <button
                            key={m}
                            onClick={() => setMode(m as any)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase transition-colors ${mode === m ? 'bg-theme-primary text-theme-bg font-bold' : 'bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20'}`}
                          >
                            {m === 'light' ? 'Clair' : m === 'dark' ? 'Sombre' : 'OLED'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="font-mono text-xs uppercase tracking-widest text-theme-primary/70">Intensité du Flou (Backdrop)</label>
                        <span className="font-mono text-lg text-theme-primary tabular-nums"><AnimatedCounter value={glassIntensity * 20} />%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={glassIntensity}
                        onChange={(e) => setGlassIntensity(Number(e.target.value))}
                        className="w-full h-1 bg-theme-primary/20 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                      />
                    </div>
                  </div>
                </Glass>
              </motion.div>
            )}

            {activeSection === "presets" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Glass level="l2" className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <Cpu className="w-5 h-5 text-theme-primary" />
                      <h3 className="font-mono text-sm uppercase tracking-widest text-theme-primary-light">Presets de Génération</h3>
                    </div>
                    <button
                      disabled={isGeneratingPresets}
                      onClick={async () => {
                        setIsGeneratingPresets(true);
                        try {
                          const { PersonaEngine } = await import('@/services/ai/PersonaEngine');
                          const newPresets = await PersonaEngine.generatePresets(3);
                          setPresets(newPresets);
                        } catch (error) {
                          console.error("Failed to generate presets", error);
                        } finally {
                          setIsGeneratingPresets(false);
                        }
                      }}
                      className="px-4 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-theme-primary border border-theme-primary/30 rounded-lg font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      {isGeneratingPresets && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isGeneratingPresets ? "Génération..." : "Générer Nouveaux"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {presets.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-theme-primary/20 rounded-xl">
                        <p className="font-mono text-xs text-theme-primary/50 uppercase tracking-widest">
                          Aucun preset disponible. Générez-en pour commencer.
                        </p>
                      </div>
                    ) : (
                      presets.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => setActivePresetId(preset.id)}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            activePresetId === preset.id
                              ? "border-theme-primary bg-theme-primary/10 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]"
                              : "border-theme-primary/20 bg-theme-bg/40 hover:border-theme-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                                <DynamicIcon 
                                  name={preset.icon} 
                                  size={20} 
                                  className="text-theme-primary" 
                                />
                              </div>
                              <h4 className="font-mono text-sm uppercase tracking-widest text-theme-primary-light">
                                {preset.label}
                              </h4>
                            </div>
                            {activePresetId === preset.id && (
                              <div className="w-2 h-2 bg-theme-primary rounded-full shadow-[0_0_8px_rgba(var(--color-primary-rgb),1)]" />
                            )}
                          </div>
                          <p className="font-sans text-sm text-theme-primary/70 mb-4">
                            {preset.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {preset.variables.map((variable) => (
                              <span
                                key={variable.name}
                                className="px-2 py-1 bg-theme-primary/5 border border-theme-primary/20 rounded text-[10px] font-mono text-theme-primary/80 uppercase"
                              >
                                {variable.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Glass>
              </motion.div>
            )}

            {activeSection === "system" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Glass level="l2" className="p-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <HardDrive className="w-5 h-5 text-theme-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-widest text-theme-primary-light">Informations Système</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-theme-primary/20 rounded-lg bg-theme-bg/40">
                        <span className="font-mono text-[10px] text-theme-primary/40 uppercase block mb-1">Version OS</span>
                        <span className="font-mono text-xs text-theme-primary uppercase">v2.1.0-AURA</span>
                      </div>
                      <div className="p-4 border border-theme-primary/20 rounded-lg bg-theme-bg/40">
                        <span className="font-mono text-[10px] text-theme-primary/40 uppercase block mb-1">Modèle IA</span>
                        <span className="font-mono text-xs text-theme-primary uppercase">Gemini 3.1 Pro</span>
                      </div>
                      <div className="p-4 border border-theme-primary/20 rounded-lg bg-theme-bg/40">
                        <span className="font-mono text-[10px] text-theme-primary/40 uppercase block mb-1">Status Firebase</span>
                        <span className="font-mono text-xs text-green-400 uppercase">Connecté</span>
                      </div>
                      <div className="p-4 border border-theme-primary/20 rounded-lg bg-theme-bg/40">
                        <span className="font-mono text-[10px] text-theme-primary/40 uppercase block mb-1">Dernière Sync</span>
                        <span className="font-mono text-xs text-theme-primary uppercase">Temps Réel</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => {
                          localStorage.removeItem('aura-ui-storage');
                          window.location.reload();
                        }}
                        className="w-full p-4 border border-red-400/30 rounded-lg bg-red-400/5 hover:bg-red-400/10 text-red-400 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="font-mono text-xs uppercase tracking-widest">Réinitialiser le Cache Local</span>
                      </button>
                    </div>
                  </div>
                </Glass>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
