import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
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
  where,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { AIService } from "@/services/ai/AIService";
import { PersonaEngine } from "@/services/ai/PersonaEngine";
import { MemoryAnalyzer } from "@/services/memory/MemoryAnalyzer";
import type { Persona, MemoryBank, ChatMessage as Message } from "@/types";
import { DynamicIcon } from './DynamicIcon';
import { Glass } from "../ui/Glass";
import {
  Send,
  Loader2,
  User as UserIcon,
  Bot,
  Terminal,
  ShieldAlert,
  Cpu,
  Star,
  RotateCcw,
  Check,
  Copy,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../stores/uiStore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { User } from "firebase/auth";

interface Chat {
  id: string;
  userId: string;
  title: string;
  selectedPersona?: Persona;
  createdAt: any;
  updatedAt: any;
}

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

export const ChatInterface = ({
  user,
  selectedChatId,
  onChatLoaded,
  selectedFavoritePersona,
  onFavoritePersonaLoaded,
}: ChatInterfaceProps) => {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const personaName = useDecrypt(currentChat?.selectedPersona?.name || "Aura_OS");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, Persona>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { presets, activePresetId } = useUIStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatRef = useRef<{ chat: Chat | null; messages: Message[] }>({
    chat: null,
    messages: [],
  });

  useEffect(() => {
    // When currentChat changes, analyze the previous one if it had a persona
    const prevChat = prevChatRef.current.chat;
    const prevMessages = prevChatRef.current.messages;

    if (
      prevChat &&
      prevChat.id !== currentChat?.id &&
      prevChat.selectedPersona &&
      prevMessages.length > 0 &&
      user
    ) {
      MemoryAnalyzer.analyzeAndPersist(
        prevChat.id,
        user.uid,
        prevChat.selectedPersona.name, // Using name as ID for now
        prevMessages.map((m) => ({
          id: m.id,
          chatId: prevChat.id,
          userId: user.uid,
          role: m.role as "user" | "model",
          content: m.content || "",
          createdAt: m.createdAt || serverTimestamp(),
          timestamp: m.createdAt?.toMillis?.() || Date.now(),
        })),
        prevChat.selectedPersona
      );
    }

    prevChatRef.current = { chat: currentChat, messages };
  }, [currentChat, messages, user]);

  // Initialize chat or load existing
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setCurrentChat(null);
      setFavorites({});
      return;
    }

    let unsubscribeChat: () => void;
    let unsubscribeMessages: () => void;
    let unsubscribeFavorites: () => void;

    const initChat = async () => {
      try {
        let currentChatId = null;

        if (selectedFavoritePersona) {
          const newChatRef = await addDoc(collection(db, "chats"), {
            userId: user.uid,
            title: `Séquence: ${selectedFavoritePersona.name}`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            selectedPersona: selectedFavoritePersona,
          });
          currentChatId = newChatRef.id;
          if (onFavoritePersonaLoaded) onFavoritePersonaLoaded();
        } else if (selectedChatId) {
          currentChatId = selectedChatId;
          if (onChatLoaded) onChatLoaded();
        } else {
          const chatsRef = collection(db, "chats");
          const q = query(chatsRef, where("userId", "==", user.uid));
          const snapshot = await getDocs(q);

          // Find user's chat
          if (!snapshot.empty) {
            const sortedDocs = snapshot.docs.sort((a, b) => {
              const timeA = a.data().updatedAt?.toMillis?.() || 0;
              const timeB = b.data().updatedAt?.toMillis?.() || 0;
              return timeB - timeA;
            });
            currentChatId = sortedDocs[0].id;
          }

          if (!currentChatId) {
            // Create new chat
            const newChatRef = await addDoc(collection(db, "chats"), {
              userId: user.uid,
              title: "Nouvelle Session",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            currentChatId = newChatRef.id;
          }
        }

        // Listen to chat document (for selectedPersona)
        unsubscribeChat = onSnapshot(
          doc(db, "chats", currentChatId),
          (docSnap) => {
            if (docSnap.exists()) {
              setCurrentChat({ id: docSnap.id, ...docSnap.data() } as Chat);
            }
          },
        );

        // Listen to messages
        const messagesRef = collection(db, `chats/${currentChatId}/messages`);
        const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

        unsubscribeMessages = onSnapshot(
          messagesQuery,
          (snapshot) => {
            const msgs = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Message,
            );
            setMessages(msgs);
            setTimeout(
              () =>
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
              100,
            );
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.LIST,
              `chats/${currentChatId}/messages`,
            );
          },
        );

        // Listen to favorites
        const favRef = collection(db, `users/${user.uid}/favoritePersonas`);
        unsubscribeFavorites = onSnapshot(
          favRef,
          (snapshot) => {
            const newFavs: Record<string, Persona> = {};
            snapshot.docs.forEach((doc) => {
              newFavs[doc.data().name] = { id: doc.id, ...doc.data() } as Persona;
            });
            setFavorites(newFavs);
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.LIST,
              `users/${user.uid}/favoritePersonas`,
            );
          },
        );
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    initChat();

    return () => {
      if (unsubscribeChat) unsubscribeChat();
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeFavorites) unsubscribeFavorites();
    };
  }, [user, refreshTrigger, selectedChatId, selectedFavoritePersona]);

  const handleRestartSequence = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, "chats"), {
        userId: user.uid,
        title: "Nouvelle Session",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error restarting sequence:", error);
    }
  };

  const toggleFavorite = async (persona: Persona) => {
    if (!user) return;
    const path = `users/${user.uid}/favoritePersonas`;
    try {
      const favId = favorites[persona.name]?.id;
      if (favId) {
        // Remove from favorites
        await deleteDoc(doc(db, path, favId));
      } else {
        // Add to favorites
        // Ensure we don't send unwanted fields like 'id'
        const { id, ...personaData } = persona;
        await addDoc(collection(db, path), {
          ...personaData,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const [personaAdjustments, setPersonaAdjustments] = useState<Record<string, Record<string, number>>>({});

  const handleAdjustPersona = (personaName: string, attributeKey: string, varianceIdx: number) => {
    setPersonaAdjustments(prev => ({
      ...prev,
      [personaName]: {
        ...(prev[personaName] || {}),
        [attributeKey]: varianceIdx
      }
    }));
  };

  const getAdjustedPersona = (persona: Persona): Persona => {
    const adjustments = personaAdjustments[persona.name];
    if (!adjustments) return persona;

    const adjustedAttributes = { ...persona.attributes };
    Object.entries(adjustments).forEach(([key, idx]) => {
      const values = persona.attributes?.[key];
      if (Array.isArray(values)) {
        adjustedAttributes[key] = values[idx];
      }
    });

    return {
      ...persona,
      attributes: adjustedAttributes
    };
  };

  const handleRegeneratePersonaResponse = async (messageId: string, persona: Persona, responseIndex: number) => {
    if (!user || !currentChat || isGenerating) return;
    
    const adjustedPersona = getAdjustedPersona(persona);
    const userMsg = messages.find(m => m.role === 'user' && m.createdAt?.toMillis() < (messages.find(m2 => m2.id === messageId)?.createdAt?.toMillis() || Infinity));
    if (!userMsg) return;

    setIsGenerating(true);
    try {
      const stream = AIService.streamS2Response(
        userMsg.content || "",
        adjustedPersona,
        {}, // empty memory
        [], // no history
        user.uid
      );

      let content = "";
      for await (const chunk of stream) {
        content += chunk;
        // We could update local state for streaming, but for simplicity let's just wait
      }

      // Update the message in Firestore
      const messageRef = doc(db, `chats/${currentChat.id}/messages`, messageId);
      const messageSnap = await getDoc(messageRef);
      if (messageSnap.exists()) {
        const data = messageSnap.data();
        const newResponses = [...(data.responses || [])];
        newResponses[responseIndex] = { persona: adjustedPersona, content };
        await updateDoc(messageRef, { responses: newResponses });
      }
    } catch (error) {
      console.error("Error regenerating persona response:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPersona = async (persona: Persona) => {
    if (!currentChat) return;
    const adjustedPersona = getAdjustedPersona(persona);
    try {
      await setDoc(
        doc(db, "chats", currentChat.id),
        { selectedPersona: adjustedPersona, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (error) {
      console.error("Error selecting persona:", error);
    }
  };

  const loadMemoryBank = async (personaName: string): Promise<MemoryBank> => {
    if (!user) return {};
    try {
      const favId = favorites[personaName]?.id;
      if (!favId) return {};

      const memoryRef = `users/${user.uid}/favoritePersonas/${favId}/memory`;
      
      const [topicsSnap, prefsSnap, summariesSnap] = await Promise.all([
        getDocs(collection(db, `${memoryRef}/topics`)),
        getDocs(collection(db, `${memoryRef}/preferences`)),
        getDocs(collection(db, `${memoryRef}/sessions_summary`))
      ]);

      return {
        topics: topicsSnap.docs.map(d => d.data() as any),
        preferences: prefsSnap.docs.map(d => d.data() as any),
        sessions_summary: summariesSnap.docs.map(d => d.data() as any)
      };
    } catch (error) {
      console.error("Error loading memory bank:", error);
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !currentChat || isGenerating) return;

    const userMessage = input.trim();
    setInput("");
    setIsGenerating(true);

    try {
      // 1. Save user message
      await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
        chatId: currentChat.id,
        userId: user.uid,
        role: "user",
        content: userMessage,
        createdAt: serverTimestamp(),
      });

      // Update chat timestamp
      await setDoc(
        doc(db, "chats", currentChat.id),
        { updatedAt: serverTimestamp() },
        { merge: true },
      );

      if (currentChat.selectedPersona) {
        // S2: Continue conversation with selected persona
        const memory = await loadMemoryBank(currentChat.selectedPersona.name);
        
        // Map history correctly, picking the right response if multiple exist
        const history = messages.map(m => {
          let content = m.content || "";
          if (m.role === "model" && m.responses && !m.content) {
            // Try to find the response from the current persona
            const matchingResponse = m.responses.find(r => r.persona.name === currentChat.selectedPersona?.name);
            content = matchingResponse ? matchingResponse.content : (m.responses[0]?.content || "");
          }
          return {
            id: m.id,
            chatId: currentChat.id,
            userId: user.uid,
            role: m.role as "user" | "model",
            content,
            createdAt: m.createdAt || serverTimestamp(),
            timestamp: m.createdAt?.toMillis?.() || Date.now(),
          };
        });

        const stream = AIService.streamS2Response(
          userMessage,
          currentChat.selectedPersona,
          memory,
          history,
          user.uid
        );

        let responseContent = "";
        setStreamingMessage("");
        for await (const chunk of stream) {
          responseContent += chunk;
          setStreamingMessage(responseContent);
        }
        setStreamingMessage(null);

        await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
          chatId: currentChat.id,
          userId: user.uid,
          role: "model",
          content: responseContent,
          createdAt: serverTimestamp(),
        });
      } else {
        // S1: Generate Personas
        const activePreset = presets.find(p => p.id === activePresetId);
        let personas = await AIService.generatePersonas(userMessage, user.uid, activePreset);

        if (personas.length === 0) {
          throw new Error("Failed to generate personas.");
        }

        // Suggest a favorite persona if any exist
        const favoriteList = Object.values(favorites);
        if (favoriteList.length > 0) {
          const suggestedFavorite = await PersonaEngine.suggestPersona(
            userMessage,
            favoriteList,
            messages.map(m => ({ 
              id: m.id, 
              chatId: currentChat.id,
              userId: user.uid,
              role: m.role as "user" | "model", 
              content: m.content || "", 
              createdAt: m.createdAt || serverTimestamp(),
              timestamp: m.createdAt?.toMillis?.() || Date.now()
            }))
          );
          if (suggestedFavorite) {
            // Replace the last generated persona with the suggested favorite
            personas[2] = suggestedFavorite;
          }
        }

        // Generate Responses in parallel
        const responses = await Promise.all(
          personas.slice(0, 3).map(async (persona) => {
            const personaWithDefaults = AIService.getPersonaWithDefaultVariances(persona);
            const stream = AIService.streamS2Response(
              userMessage,
              personaWithDefaults,
              {}, // empty memory for now
              [], // no history for initial response
              user.uid
            );
            let content = "";
            for await (const chunk of stream) {
              content += chunk;
            }
            return { persona, content };
          }),
        );

        // Save model message with responses
        await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
          chatId: currentChat.id,
          userId: user.uid,
          role: "model",
          responses,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      console.error("Error generating response:", error);
      const errorMessage = error?.message || "Une erreur inconnue est survenue.";
      // Fallback error message
      await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
        chatId: currentChat.id,
        userId: user.uid,
        role: "model",
        content: `Une erreur est survenue lors de la génération de la réponse. (${errorMessage})`,
        createdAt: serverTimestamp(),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-transparent relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 z-0">
        {currentChat?.selectedPersona && (
          <Glass
            level="l3"
            className="sticky top-0 z-20 p-3 flex items-center justify-between mb-8"
          >
            <div className="flex items-center space-x-3 text-theme-primary-light">
              <ShieldAlert className="w-5 h-5" />
              <span className="font-mono text-sm uppercase tracking-widest font-bold">
                Connexion Établie : {currentChat.selectedPersona.name}
              </span>
              <button
                onClick={() => toggleFavorite(currentChat.selectedPersona!)}
                className="text-theme-primary hover:text-theme-primary/80 transition-colors focus:outline-none ml-2"
                title={
                  favorites[currentChat.selectedPersona.name]
                    ? "Retirer des favoris"
                    : "Ajouter aux favoris"
                }
              >
                <Star
                  className={`w-4 h-4 ${favorites[currentChat.selectedPersona.name] ? "fill-theme-primary" : ""}`}
                />
              </button>
            </div>
            <div className="font-mono text-[10px] text-theme-primary/70 hidden sm:block">
              {currentChat.selectedPersona.attributes && Object.entries(currentChat.selectedPersona.attributes)
                .slice(0, 2)
                .map(([key, value]) => `${key.toUpperCase()}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join(' | ')}
            </div>
          </Glass>
        )}

        {!user ? (
          <div className="h-full flex flex-col items-center justify-center text-theme-primary/50 space-y-4">
            <Bot className="w-16 h-16 opacity-50" />
            <p className="font-mono uppercase tracking-widest text-sm text-center">
              Aura OS v1.4
              <br />
              Authentification requise pour accéder au réseau
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-theme-primary/50 space-y-4">
            <div className="w-16 h-16 border border-theme-primary/30 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-theme-primary rounded-full animate-ping"></div>
            </div>
            <p className="font-mono uppercase tracking-widest text-sm text-center max-w-md">
              Séquence S1 Prête.
              <br />
              <br />
              Entrez une requête. Le système générera 3 personas uniques (Nom,
              Ton, Lexique, Abstraction, Biais, Signature) pour moduler la
              réponse.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {msg.role === "user" ? (
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
                    {msg.content}
                  </p>
                </Glass>
              ) : (
                <div className="w-full space-y-6">
                  {msg.responses && msg.responses.length > 0 ? (
                    <>
                      <div className="flex items-center space-x-2 text-theme-primary-light/70 mb-4">
                        <Cpu className="w-4 h-4" />
                        <span className="font-mono text-xs uppercase">
                          Aura_Personas_Generated
                        </span>
                      </div>

                      <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: { transition: { staggerChildren: 0.1 } }
                        }}
                        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
                      >
                        {msg.responses.map((resp, idx) => {
                          const isSelected =
                            currentChat?.selectedPersona?.name ===
                            resp.persona.name;
                          return (
                            <motion.div
                              key={idx}
                              variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 }
                              }}
                            >
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
                                          name={resp.persona.icon || "Bot"} 
                                          size={18} 
                                          className="text-theme-primary" 
                                        />
                                      </div>
                                      <h3 className="font-mono font-bold text-theme-primary-light uppercase tracking-wider text-sm">
                                        {resp.persona.name}
                                      </h3>
                                      <button
                                        onClick={() =>
                                          toggleFavorite(resp.persona)
                                        }
                                        className="text-theme-primary hover:text-theme-primary/80 transition-colors focus:outline-none"
                                        title={
                                          favorites[resp.persona.name]
                                            ? "Retirer des favoris"
                                            : "Ajouter aux favoris"
                                        }
                                      >
                                        <Star
                                          className={`w-4 h-4 ${favorites[resp.persona.name] ? "fill-theme-primary" : ""}`}
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
                                    {resp.persona.attributes && Object.entries(resp.persona.attributes).map(([key, value]) => {
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
                                                  handleAdjustPersona(resp.persona.name, key, idx);
                                                }}
                                                className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] border transition-all ${
                                                  (personaAdjustments[resp.persona.name]?.[key] ?? 0) === idx 
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
                                    <ReactMarkdown>{resp.content}</ReactMarkdown>
                                  </div>
                                </div>
                                 {/* Signature & Actions */}
                                 <div className="bg-theme-primary-darker/20 border-t border-theme-primary/20 p-3 flex flex-col space-y-3">
                                   <div className="flex justify-between items-center">
                                     <CopyButton text={resp.content} />
                                     {Object.keys(personaAdjustments[resp.persona.name] || {}).length > 0 && (
                                       <button
                                         onClick={() => handleRegeneratePersonaResponse(msg.id, resp.persona, idx)}
                                         disabled={isGenerating}
                                         className="flex items-center space-x-1 font-mono text-[9px] text-theme-primary hover:text-theme-primary-light transition-colors"
                                       >
                                         <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                         <span>RÉGÉNÉRER</span>
                                       </button>
                                     )}
                                     <span className="font-mono text-[10px] text-theme-primary/50 italic text-right">
                                       {resp.persona.attributes?.signature || ''}
                                     </span>
                                   </div>
                                  {!currentChat?.selectedPersona && (
                                    <button
                                      onClick={() =>
                                        handleSelectPersona(resp.persona)
                                      }
                                      className="w-full py-2 bg-theme-primary-dark/20 hover:bg-theme-primary/20 border border-theme-primary/50 text-theme-primary-light font-mono text-xs uppercase tracking-widest transition-colors"
                                    >
                                      Sélectionner ce persona
                                    </button>
                                  )}
                                </div>
                              </Glass>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </>
                  ) : (
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
                              {personaName}
                            </span>
                            <span className="font-mono text-[9px] text-theme-primary/50 uppercase tracking-tighter">
                              {currentChat?.selectedPersona?.attributes?.tone || "System"}
                            </span>
                          </div>
                        </div>
                        {currentChat?.selectedPersona && (
                          <button
                            onClick={() =>
                              toggleFavorite(currentChat.selectedPersona!)
                            }
                            className="text-theme-primary/50 hover:text-theme-primary transition-colors focus:outline-none p-2 bg-theme-primary/5 rounded-full"
                            title={
                              favorites[currentChat.selectedPersona.name]
                                ? "Retirer des favoris"
                                : "Ajouter aux favoris"
                            }
                          >
                            <Star
                              className={`w-4 h-4 ${favorites[currentChat.selectedPersona.name] ? "fill-theme-primary text-theme-primary" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                      <div className="prose prose-invert prose-sm prose-p:font-sans prose-p:text-theme-text-light/90 prose-p:leading-relaxed prose-headings:font-display prose-headings:text-theme-primary-light prose-a:text-theme-primary prose-strong:text-theme-primary-light max-w-none">
                        <ReactMarkdown>{msg.content || ""}</ReactMarkdown>
                      </div>
                      <div className="mt-4 flex justify-between items-center border-t border-theme-primary/10 pt-3">
                        <CopyButton text={msg.content || ""} />
                        <span className="font-mono text-[10px] text-theme-primary/40 italic">
                          {currentChat?.selectedPersona?.attributes?.signature || ''}
                        </span>
                      </div>
                    </Glass>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {streamingMessage !== null && (
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
                    {personaName}
                  </span>
                  <span className="font-mono text-[9px] text-theme-primary/50 uppercase tracking-tighter">
                    {currentChat?.selectedPersona?.attributes?.tone || "System"}
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
        )}

        {isGenerating && streamingMessage === null && (
          <div className="flex items-start space-x-4">
            <div className="flex items-center space-x-2 text-theme-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-mono text-xs uppercase tracking-widest animate-pulse">
                {currentChat?.selectedPersona
                  ? `Analyse par ${currentChat.selectedPersona.name} en cours...`
                  : "Génération des personas en cours..."}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-theme-bg via-theme-bg/90 to-transparent z-10 flex flex-col items-center">
        <form onSubmit={handleSubmit} className="relative w-full max-w-4xl">
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
            onClick={(e) => {
              const btn = e.currentTarget;
              const ripple = document.createElement("span");
              const rect = btn.getBoundingClientRect();
              const size = Math.max(rect.width, rect.height);
              const x = e.clientX - rect.left - size / 2;
              const y = e.clientY - rect.top - size / 2;
              
              ripple.style.width = ripple.style.height = `${size}px`;
              ripple.style.left = `${x}px`;
              ripple.style.top = `${y}px`;
              ripple.classList.add("ripple");
              
              btn.appendChild(ripple);
              setTimeout(() => ripple.remove(), 600);
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="w-full max-w-4xl mt-3 flex justify-between items-center px-2">
          <span className="font-mono text-[9px] text-theme-primary/30 uppercase tracking-widest">
            Aura_OS // Secure Connection
          </span>
          <button
            onClick={handleRestartSequence}
            disabled={!user || isGenerating}
            className="flex items-center space-x-1.5 text-theme-primary/40 hover:text-theme-primary transition-colors font-mono text-[9px] uppercase tracking-widest disabled:opacity-50"
            title="Redémarrer la séquence S1 (Nouvelle session)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </main>
  );
};
