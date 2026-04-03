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
import { useDecrypt } from "../hooks/useDecrypt";
import { motion } from "framer-motion";
import { useUIStore } from "../stores/uiStore";
import { useChatStore } from "../stores/chatStore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { User } from "firebase/auth";

import { MessageBubble } from "../components/chat/MessageBubble";
import { PersonaCard } from "../components/chat/PersonaCard";
import { ChatInput } from "../components/chat/ChatInput";
import { TypingIndicator } from "../components/chat/TypingIndicator";
import { Cpu } from "lucide-react";

interface ChatInterfaceProps {
  user: User | null;
  selectedChatId?: string | null;
  onChatLoaded?: () => void;
  selectedFavoritePersona?: Persona | null;
  onFavoritePersonaLoaded?: () => void;
}

export const ChatScreen = ({
  user,
  selectedChatId,
  onChatLoaded,
  selectedFavoritePersona,
  onFavoritePersonaLoaded,
}: ChatInterfaceProps) => {
  const {
    currentChat,
    setCurrentChat,
    messages,
    setMessages,
    input,
    setInput,
    isGenerating,
    setIsGenerating,
    streamingMessage,
    setStreamingMessage
  } = useChatStore();

  const personaName = useDecrypt(currentChat?.selectedPersona?.name || "Aura_OS");
  const [favorites, setFavorites] = useState<Record<string, Persona>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { presets, activePresetId } = useUIStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatRef = useRef<{ chat: any | null; messages: Message[] }>({
    chat: null,
    messages: [],
  });

  useEffect(() => {
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
        prevChat.selectedPersona.name,
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

          if (!snapshot.empty) {
            const sortedDocs = snapshot.docs.sort((a, b) => {
              const timeA = a.data().updatedAt?.toMillis?.() || 0;
              const timeB = b.data().updatedAt?.toMillis?.() || 0;
              return timeB - timeA;
            });
            currentChatId = sortedDocs[0].id;
          }

          if (!currentChatId) {
            const newChatRef = await addDoc(collection(db, "chats"), {
              userId: user.uid,
              title: "Nouvelle Session",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            currentChatId = newChatRef.id;
          }
        }

        unsubscribeChat = onSnapshot(
          doc(db, "chats", currentChatId),
          (docSnap) => {
            if (docSnap.exists()) {
              setCurrentChat({ id: docSnap.id, ...docSnap.data() } as any);
            }
          },
        );

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
        await deleteDoc(doc(db, path, favId));
      } else {
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
        {},
        [],
        user.uid
      );

      let content = "";
      for await (const chunk of stream) {
        content += chunk;
      }

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
      await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
        chatId: currentChat.id,
        userId: user.uid,
        role: "user",
        content: userMessage,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "chats", currentChat.id),
        { updatedAt: serverTimestamp() },
        { merge: true },
      );

      if (currentChat.selectedPersona) {
        const memory = await loadMemoryBank(currentChat.selectedPersona.name);
        
        const history = messages.map(m => {
          let content = m.content || "";
          if (m.role === "model" && m.responses && !m.content) {
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
        const activePreset = presets.find(p => p.id === activePresetId);
        let personas = await AIService.generatePersonas(userMessage, user.uid, activePreset);

        if (personas.length === 0) {
          throw new Error("Failed to generate personas.");
        }

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
             personas = [suggestedFavorite, ...personas.slice(0, 2)];
          }
        }

        const responses = await Promise.all(
          personas.map(async (p) => {
            const memory = await loadMemoryBank(p.name);
            const stream = AIService.streamS2Response(userMessage, p, memory, [], user.uid);
            let content = "";
            for await (const chunk of stream) {
              content += chunk;
            }
            return { persona: p, content };
          }),
        );

        await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
          chatId: currentChat.id,
          userId: user.uid,
          role: "model",
          responses,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error in chat:", error);
    } finally {
      setIsGenerating(false);
      setStreamingMessage(null);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full relative z-10">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-hide pb-32">
        {messages.length === 0 ? (
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
                <MessageBubble role="user" content={msg.content || ""} />
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
                              <PersonaCard
                                persona={resp.persona}
                                content={resp.content}
                                isSelected={isSelected}
                                isGenerating={isGenerating}
                                isFavorite={!!favorites[resp.persona.name]}
                                adjustments={personaAdjustments[resp.persona.name] || {}}
                                onToggleFavorite={toggleFavorite}
                                onAdjust={handleAdjustPersona}
                                onRegenerate={() => handleRegeneratePersonaResponse(msg.id, resp.persona, idx)}
                                onSelect={() => handleSelectPersona(resp.persona)}
                                showSelectButton={!currentChat?.selectedPersona}
                              />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </>
                  ) : (
                    <MessageBubble 
                      role="model" 
                      content={msg.content || ""} 
                      personaName={personaName}
                      personaTone={currentChat?.selectedPersona?.attributes?.tone}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}

        <TypingIndicator 
          personaName={personaName}
          personaTone={currentChat?.selectedPersona?.attributes?.tone}
          streamingMessage={streamingMessage}
          isGenerating={isGenerating}
          isS1={!currentChat?.selectedPersona}
        />
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        user={user}
        currentChat={currentChat}
        isGenerating={isGenerating}
        onRestartSequence={handleRestartSequence}
      />
    </main>
  );
};
