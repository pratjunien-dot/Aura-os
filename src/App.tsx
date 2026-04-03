import { ChatInterface } from "./components/ChatInterface";
import React, { useState, useEffect, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  getDoc,
  where,
  deleteDoc,
  getDocFromServer,
  updateDoc,
} from "firebase/firestore";
import * as Sentry from "@sentry/react";
import { AIService } from "@/services/ai/AIService";
import { PersonaEngine } from "@/services/ai/PersonaEngine";
import { MemoryAnalyzer } from "@/services/memory/MemoryAnalyzer";
import type { Persona, MemoryBank } from "@/types";
import { DynamicIcon } from './components/DynamicIcon';
import {
  Menu,
  Radio,
  Cloud,
  Newspaper,
  LogIn,
  LogOut,
  Send,
  Loader2,
  User as UserIcon,
  Bot,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
  Cpu,
  Star,
  LayoutDashboard,
  Settings,
  Palette,
  MessageSquare,
  RotateCcw,
  History,
  Heart,
  Home,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "./stores/uiStore";
import { Glass } from "./ui/Glass";
import { DebateView } from "./components/DebateView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlassSkeleton } from "./components/GlassSkeleton";
import { FavoritesDrawer } from "./components/FavoritesDrawer";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { useSwipeGesture } from "./lib/useSwipeGesture";

import { handleFirestoreError, OperationType } from "./lib/firestoreUtils";

// --- Types ---
interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: "user" | "model";
  content?: string;
  responses?: { persona: Persona; content: string }[];
  createdAt: any;
}

interface Chat {
  id: string;
  userId: string;
  title: string;
  selectedPersona?: Persona;
  createdAt: any;
  updatedAt: any;
}

// --- Components ---

const stations = [
  {
    name: "FRANCE INTER",
    url: "https://icecast.radiofrance.fr/franceinter-midfi.mp3",
  },
  {
    name: "FRANCE INFO",
    url: "https://icecast.radiofrance.fr/franceinfo-midfi.mp3",
  },
  {
    name: "FRANCE CULTURE",
    url: "https://icecast.radiofrance.fr/franceculture-midfi.mp3",
  },
  { name: "FIP", url: "https://icecast.radiofrance.fr/fip-midfi.mp3" },
  { name: "MOUV", url: "https://icecast.radiofrance.fr/mouv-midfi.mp3" },
  {
    name: "FRANCE MUSIQUE",
    url: "https://icecast.radiofrance.fr/francemusique-midfi.mp3",
  },
];

const RadioPlayer = ({ 
  isPlaying, 
  setIsPlaying, 
  currentStation, 
  setCurrentStation 
}: { 
  isPlaying: boolean; 
  setIsPlaying: (v: boolean) => void; 
  currentStation: number; 
  setCurrentStation: (v: number) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const changeStation = (e: React.MouseEvent, dir: number) => {
    e.stopPropagation();
    let next = currentStation + dir;
    if (next < 0) next = stations.length - 1;
    if (next >= stations.length) next = 0;
    setCurrentStation(next);
    setIsPlaying(false);
  };

  return (
    <motion.div
      animate={{ width: isExpanded ? 200 : 32 }}
      className="relative flex items-center h-8 bg-theme-primary/10 rounded-full border border-theme-primary/20 overflow-hidden cursor-pointer backdrop-blur-md"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
        <Radio className={`w-4 h-4 text-theme-primary-light ${isPlaying ? 'animate-pulse' : ''}`} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center flex-1 pr-3 space-x-2"
          >
            <button
              onClick={togglePlay}
              className="w-6 h-6 flex items-center justify-center bg-theme-primary/20 rounded-full text-theme-primary-light hover:bg-theme-primary/40 transition-colors"
            >
              {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
            </button>

            <div className="flex items-center space-x-1 flex-1">
              <button onClick={(e) => changeStation(e, -1)} className="text-theme-primary/50 hover:text-theme-primary-light">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[9px] uppercase tracking-tighter theme-gradient truncate w-16 text-center">
                {stations[currentStation].name}
              </span>
              <button onClick={(e) => changeStation(e, 1)} className="text-theme-primary/50 hover:text-theme-primary-light">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-end space-x-[2px] h-3">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: isPlaying ? [3, 10, 4, 12, 3][i % 5] : 2 }}
                  transition={{ repeat: Infinity, duration: 0.5 + i * 0.1 }}
                  className="w-[2px] bg-theme-primary-light/60 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-theme-primary/50 hover:text-theme-primary-light transition-colors p-1"
      title="Copier la réponse"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

const ViewContainer = ({ 
  children, 
  viewKey, 
  direction,
  headerVisible,
  dockVisible
}: { 
  children: React.ReactNode; 
  viewKey: string; 
  direction: number;
  headerVisible: boolean;
  dockVisible: boolean;
}) => {
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
      filter: "blur(8px)"
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)"
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
      filter: "blur(8px)"
    })
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={viewKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate={{
          ...variants.center,
          top: headerVisible ? 56 : 8,
          bottom: dockVisible ? 70 : 8,
        }}
        exit="exit"
        transition={{ 
          top: { duration: 0.3, ease: "easeInOut" },
          bottom: { duration: 0.3, ease: "easeInOut" },
          default: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
        }}
        className="flex-1 flex flex-col absolute left-0 right-0 pt-4 px-2 sm:px-4 pb-2 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

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

const StatusBadge = ({ label, activity = 0.5 }: { label: string; activity?: number }) => (
  <div className="flex items-center gap-2 px-3 py-1 bg-theme-bg/40 border border-theme-primary/20 rounded-full">
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 2 - activity * 1.5 }}
      className="w-2 h-2 bg-theme-primary rounded-full shadow-[0_0_8px_#00D4FF]"
    />
    <span className="font-mono text-[10px] uppercase tracking-tighter text-theme-primary/80">
      {label}
    </span>
  </div>
);

const FloatingDock = ({
  currentView,
  setView,
  isVisible,
  setIsVisible,
}: {
  currentView: string;
  setView: (v: any) => void;
  isVisible: boolean;
  setIsVisible: (v: boolean) => void;
}) => {
  const { dockPinned, setDockPinned, hasSeenDockTip, setHasSeenDockTip } = useUIStore();
  const dockRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const views = ["dashboard", "chat", "debate", "settings"];
  const currentIndex = views.indexOf(currentView);

  const startHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // User wants it to disappear in all circumstances after 2s
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setDockPinned(false); // Unpin as well to satisfy "all circumstances"
    }, 2000);
  };

  const navigate = (dir: number) => {
    const nextIndex = (currentIndex + dir + views.length) % views.length;
    setView(views[nextIndex]);
    // Show dock on swipe
    setIsVisible(true);
  };

  useSwipeGesture({
    targetRef: dockRef,
    onSwipeLeft: () => navigate(1),
    onSwipeRight: () => navigate(-1),
    onSwipeUp: () => {
      if (isVisible) setIsVisible(false);
    },
    onSwipeDown: () => {
      if (isVisible) setIsVisible(false);
    }
  });

  useEffect(() => {
    if (isVisible) {
      startHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isVisible, currentView]);

  return (
    <div 
      ref={dockRef}
      className="fixed bottom-0 left-0 right-0 w-full z-50 flex flex-col items-center gap-0"
    >
      <AnimatePresence>
        {!hasSeenDockTip && isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-theme-primary/20 text-theme-primary text-[10px] px-3 py-1 rounded-full backdrop-blur-md border border-theme-primary/30 flex items-center gap-2 cursor-pointer whitespace-nowrap mb-2"
            onClick={() => setHasSeenDockTip(true)}
          >
            <span>Swipe horizontal : Naviguer | Vertical : Masquer</span>
            <Check className="w-3 h-3" />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 70, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-auto max-w-max mx-auto"
          >
            <Glass level="l4" className={`flex items-center justify-center px-6 py-3 space-x-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-theme-primary/20 backdrop-blur-2xl transition-all duration-500 mb-6 ${dockPinned ? 'bg-theme-primary/10' : ''}`}>
              {[
                { id: "dashboard", icon: Home, label: "Accueil" },
                { id: "chat", icon: MessageSquare, label: "Chat" },
                { id: "debate", icon: Bot, label: "Débat" },
                { id: "settings", icon: Settings, label: "Réglages" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 group ${
                    currentView === id 
                      ? "text-theme-primary" 
                      : "text-theme-primary/40 hover:text-theme-primary/80"
                  }`}
                  title={label}
                >
                  {currentView === id && (
                    <motion.div 
                      layoutId="activeHalo"
                      className="absolute inset-0 bg-theme-primary/20 blur-md rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${currentView === id ? 'scale-110 animate-breathe' : 'group-hover:scale-125'}`} />
                </button>
              ))}
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => {
          setIsVisible(!isVisible);
        }}
        className={`h-1 transition-all duration-500 cursor-pointer ${isVisible ? 'w-24 bg-theme-primary/10 hover:bg-theme-primary/30' : 'w-48 bg-theme-primary/30 hover:bg-theme-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.6)]'} mb-1.5 rounded-full`}
        title={isVisible ? "Masquer le footer" : "Afficher le footer"}
      />
    </div>
  );
};

const Header = ({
  user,
  onLogin,
  onLogout,
  radio,
  isVisible,
  setIsVisible,
}: {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  radio: React.ReactNode;
  isVisible: boolean;
  setIsVisible: (v: boolean) => void;
}) => {
  const {
    view: currentView,
    setView: setCurrentView,
    openDrawer,
  } = useUIStore();

  return (
    <div className="sticky top-0 z-50 flex flex-col items-center">
      <AnimatePresence>
        {isVisible && (
          <motion.header 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="w-full h-12 glass l3 border-b border-theme-primary/20 flex items-center justify-between px-6 !rounded-none"
          >
            {/* Dynamic Halo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{
                  opacity: [0.1, 0.2, 0.1],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-theme-primary/10 blur-[100px] rounded-full"
              />
            </div>

            <div className="flex items-center space-x-4 relative z-10">
              <h1 className="font-display text-sm tracking-widest uppercase glitch-hover cursor-default theme-gradient hidden sm:block">
                Aura_OS
              </h1>
              {radio}
              <div className="hidden md:flex items-center space-x-4">
                <StatusBadge label="System: Active" activity={0.3} />
                <StatusBadge label="Neural: Link" activity={0.8} />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => openDrawer("favorites")}
                    className="text-theme-primary/50 hover:text-theme-primary transition-colors"
                    title="Favoris"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDrawer("history")}
                    className="text-theme-primary/50 hover:text-theme-primary transition-colors"
                    title="Historique"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[10px] text-theme-primary/40 uppercase tracking-tighter">
                      {user.displayName || "User"}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-theme-primary/50 hover:text-theme-primary transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="flex items-center space-x-2 text-theme-primary hover:text-theme-primary/80 transition-colors font-mono text-sm uppercase"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className={`h-2 transition-all duration-300 cursor-pointer ${isVisible ? 'w-12 bg-theme-primary/20 hover:bg-theme-primary/50' : 'w-24 bg-theme-primary/40 hover:bg-theme-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)]'}`}
        title={isVisible ? "Masquer le header" : "Afficher le header"}
      />
    </div>
  );
};

const DashboardView = React.lazy(() => import('./components/DashboardView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));

interface ChatInterfaceProps {
  user: User | null;
  selectedChatId?: string | null;
  onChatLoaded?: () => void;
  selectedFavoritePersona?: Persona | null;
  onFavoritePersonaLoaded?: () => void;
}

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


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [dockVisible, setDockVisible] = useState(false);
  const {
    _hasHydrated,
    view: currentView,
    theme,
    openDrawer,
    setView: setCurrentView,
    presets,
    activePresetId,
  } = useUIStore();
  const [sessions, setSessions] = useState<Chat[]>([]);
  const [favorites, setFavorites] = useState<Record<string, Persona>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedFavoritePersona, setSelectedFavoritePersona] =
    useState<Persona | null>(null);
  const [swipeDirection, setSwipeDirection] = useState(0);

  const views = ["dashboard", "chat", "debate", "settings"];

  useSwipeGesture({
    onSwipeLeft: () => {
      const idx = views.indexOf(currentView);
      if (idx < views.length - 1) {
        setSwipeDirection(1);
        setCurrentView(views[idx + 1] as any);
      }
    },
    onSwipeRight: () => {
      const idx = views.indexOf(currentView);
      if (idx > 0) {
        setSwipeDirection(-1);
        setCurrentView(views[idx - 1] as any);
      }
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user exists in Firestore
        let retries = 3;
        while (retries > 0) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            // Use getDocFromServer to test connection and force network
            const userSnap = await getDocFromServer(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: serverTimestamp(),
              });
            }
            break; // Success
          } catch (error) {
            retries--;
            if (retries === 0) {
              if (error instanceof Error && error.message.includes("the client is offline")) {
                console.error("CRITICAL: Firestore is offline. This usually means the configuration in firebase-applet-config.json is incorrect or the database is not provisioned.");
              }
              handleFirestoreError(
                error,
                OperationType.CREATE,
                `users/${currentUser.uid}`,
              );
            } else {
              console.warn(`Firestore connection attempt failed, retrying... (${retries} left)`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      }
      setUser(currentUser);
      if (currentUser) {
        Sentry.setUser({ id: currentUser.uid });
      } else {
        Sentry.setUser(null);
      }
      setAuthReady(true);
    });

    let unsubscribeSessions: () => void;
    let unsubscribeFavorites: () => void;

    if (auth.currentUser) {
      const sessionsRef = collection(db, "chats");
      const q = query(
        sessionsRef,
        where("userId", "==", auth.currentUser.uid),
        orderBy("updatedAt", "desc"),
      );
      unsubscribeSessions = onSnapshot(q, (snapshot) => {
        setSessions(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Chat),
        );
      });

      const favRef = collection(
        db,
        `users/${auth.currentUser.uid}/favoritePersonas`,
      );
      unsubscribeFavorites = onSnapshot(favRef, (snapshot) => {
        const newFavs: Record<string, Persona> = {};
        snapshot.docs.forEach((doc) => {
          newFavs[doc.data().name] = { id: doc.id, ...doc.data() } as Persona;
        });
        setFavorites(newFavs);
      });
    }

    return () => {
      unsubscribe();
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribeFavorites) unsubscribeFavorites();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioStation, setRadioStation] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (radioPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [radioPlaying, radioStation]);

  if (!authReady || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-theme-bg-deep flex items-center justify-center relative overflow-hidden">
        {/* Dynamic Background Gradient (Water rhythm) */}
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, hsl(220, 50%, 10%) 0%, #000 70%)",
              "radial-gradient(circle at 80% 80%, hsl(280, 50%, 10%) 0%, #000 70%)",
              "radial-gradient(circle at 20% 80%, hsl(340, 50%, 10%) 0%, #000 70%)",
              "radial-gradient(circle at 80% 20%, hsl(40, 50%, 10%) 0%, #000 70%)",
              "radial-gradient(circle at 20% 20%, hsl(220, 50%, 10%) 0%, #000 70%)",
            ],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
        />

        {/* Shifting Shadows (Water-like movement) */}
        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [-30, 30, -30],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-[-100px] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"
        />

        {/* Shimmering Inverted Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => {
            const delay = Math.random() * 5;
            const duration = 5 + Math.random() * 5;
            return (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: (Math.random() - 0.5) * 1000,
                  y: (Math.random() - 0.5) * 1000
                }}
                animate={{ 
                  opacity: [0, 0.8, 0.4, 1, 0.5, 0], 
                  scale: [0, 1.2, 0.8, 1.5, 1, 0],
                  x: [(Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000],
                  y: [(Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000],
                  backgroundColor: [
                    "hsl(40, 80%, 60%)",  // Inverted Blue (Gold)
                    "hsl(100, 80%, 60%)", // Inverted Purple (Green)
                    "hsl(160, 80%, 60%)", // Inverted Red (Teal)
                    "hsl(220, 80%, 60%)", // Inverted Gold (Blue)
                    "hsl(40, 80%, 60%)",
                  ]
                }}
                transition={{ 
                  duration, 
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut"
                }}
                className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full blur-[0.5px]"
                style={{
                  boxShadow: "0 0 20px currentColor"
                }}
              >
                {/* Scintillation (Twinkle) */}
                <motion.div
                  animate={{
                    opacity: [0.2, 1, 0.2],
                    scale: [1, 2.5, 1],
                  }}
                  transition={{
                    duration: 0.2 + Math.random() * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-full h-full bg-white rounded-full"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg-deep text-theme-primary font-sans overflow-hidden">
      <div className="stardust-bg" />
      <audio ref={audioRef} src={stations[radioStation].url} />
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        radio={
          <RadioPlayer
            isPlaying={radioPlaying}
            setIsPlaying={setRadioPlaying}
            currentStation={radioStation}
            setCurrentStation={setRadioStation}
          />
        }
        isVisible={headerVisible}
        setIsVisible={setHeaderVisible}
      />
      <ViewContainer
        viewKey={currentView}
        direction={swipeDirection}
        headerVisible={headerVisible}
        dockVisible={dockVisible}
      >
        {currentView === "dashboard" && <DashboardView />}
        {currentView === "chat" && (
          <ChatInterface
            user={user}
            selectedChatId={selectedChatId}
            onChatLoaded={() => {}}
            selectedFavoritePersona={selectedFavoritePersona}
            onFavoritePersonaLoaded={() => {}}
          />
        )}
        {currentView === "debate" && (
          <DebateView favorites={favorites} userId={user?.uid || ""} />
        )}
        {currentView === "settings" && <SettingsView />}
      </ViewContainer>
      <FloatingDock
        currentView={currentView}
        setView={setCurrentView}
        isVisible={dockVisible}
        setIsVisible={setDockVisible}
      />
    </div>
  );
}
