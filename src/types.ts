export interface PresetVariable {
  name: string;
  values: string[];
}

export interface Preset {
  id: string;
  label: string;
  icon: string;
  description: string;
  variables: PresetVariable[];
}

export interface Persona {
  id?: string;
  name: string;
  icon?: string;
  attributes: Record<string, string | string[]>;
  // Keep these for backward compatibility during transition if needed, or remove them.
  // Actually, let's remove them and fix the errors.
  temporal?: {
    era: string;
    role: string;
    knowledgeCutoff: string;
    forbiddenConcepts: string[];
    idioms: string[];
    historicalBias: string;
  };
}

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'model';
  content?: string;
  responses?: { persona: Persona; content: string }[];
  createdAt: any;
  timestamp: number;
}

export interface TopicUpdate {
  label: string;
  count: number;
  lastDiscussed?: any;
  keyPoints: string[];
}

export interface Preference {
  type: 'response_length' | 'formality' | 'example_density';
  value: string | number;
  confidence: number;
}

export interface MemoryBank {
  topics?: TopicUpdate[];
  preferences?: Preference[];
  sessions_summary?: any[];
}
