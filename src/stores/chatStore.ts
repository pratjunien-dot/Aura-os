import { create } from 'zustand';
import type { ChatMessage as Message, Persona } from '@/types';

interface Chat {
  id: string;
  userId: string;
  title: string;
  selectedPersona?: Persona;
  createdAt: any;
  updatedAt: any;
}

interface ChatStore {
  currentChat: Chat | null;
  messages: Message[];
  input: string;
  isGenerating: boolean;
  streamingMessage: string | null;
  
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  setInput: (input: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setStreamingMessage: (msg: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  currentChat: null,
  messages: [],
  input: "",
  isGenerating: false,
  streamingMessage: null,

  setCurrentChat: (chat) => set({ currentChat: chat }),
  setMessages: (messages) => set({ messages }),
  setInput: (input) => set({ input }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setStreamingMessage: (streamingMessage) => set({ streamingMessage }),
}));
