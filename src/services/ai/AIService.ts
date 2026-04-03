/**
 * AIService — Seul point d'entrée pour toutes les features.
 * Les features n'importent jamais GeminiAdapter directement.
 */
import { GeminiAdapter } from './GeminiAdapter';
import { SentinelGuard } from './SentinelGuard';
import { ContextBuilder } from '../memory/ContextBuilder';
import { Type } from '@google/genai';
import type { Persona, ChatMessage, MemoryBank, Preset } from '@/types';

const adapter = new GeminiAdapter(""); // API key handled internally by adapter

export const AIService = {

  /**
   * S1 — Génère 3 personas distincts pour un prompt utilisateur en utilisant un preset.
   */
  async generatePersonas(userPrompt: string, userId: string, preset?: Preset): Promise<Persona[]> {
    const sentinel = SentinelGuard.sanitize(userPrompt);
    SentinelGuard.logThreat(userId, sentinel);

    // Si aucun preset n'est fourni, on utilise un schéma par défaut
    const defaultVariables = [
      { name: "tone", values: ["formal", "casual", "academic", "creative"] },
      { name: "lexicon", values: ["technical", "simple", "poetic", "direct"] },
      { name: "abstraction", values: ["low", "medium", "high"] },
      { name: "bias", values: ["optimistic", "pessimistic", "neutral", "analytical"] },
      { name: "signature", values: ["short", "detailed", "quirky"] }
    ];

    const variables = preset?.variables || defaultVariables;
    
    const properties: Record<string, any> = {
      name: { type: Type.STRING },
      icon: { type: Type.STRING }
    };

    const required = ['name', 'icon'];

    // On construit le schéma dynamiquement en fonction des variables du preset
    const attributesProperties: Record<string, any> = {};
    for (const variable of variables) {
      attributesProperties[variable.name] = { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: `Génère 3 variances pour cette variable (ex: [valeur_principale, nuance_1, nuance_2])`
      };
    }

    properties.attributes = {
      type: Type.OBJECT,
      properties: attributesProperties,
      required: variables.map(v => v.name)
    };
    required.push('attributes');

    const schema = {
      type: Type.OBJECT,
      properties: {
        personas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties,
            required
          }
        }
      }
    };

    const systemPrompt = `Tu es le générateur de personas d'AURA OS.
L'utilisateur a demandé : "${sentinel.clean || 'Aide-moi à explorer ce sujet'}"
Génère 3 personas distincts qui pourraient répondre à cette demande de manière unique et intéressante.

Pour chaque persona :
1. Choisis un NOM court et évocateur.
2. Choisis une ICÔNE parmi les noms d'icônes Lucide valides (ex: Sparkles, Zap, Brain, Rocket, Shield, Target, MessageSquare, Lightbulb, Bot, Cpu, Terminal, Database, Globe, Music, Camera, Heart, Star, Cloud, Sun, Moon, Wind, Ghost, Coffee, Book, Pen, Code, Activity, Layers, Layout, Grid, Box, Package, Archive, Search, Settings, User, Users, Lock, Unlock, Key, Bell, Info, AlertTriangle, CheckCircle, XCircle, HelpCircle).
3. Définis des attributs basés sur le preset suivant.

Pour CHAQUE attribut, génère exactement 3 variances (la première étant la valeur par défaut).
Preset :
${variables.map(v => `- ${v.name}: choisis parmi ou inspire-toi de [${v.values.join(', ')}]`).join('\n')}`;

    try {
      const result = await adapter.generateStructured<{ personas: Persona[] }>(
        systemPrompt,
        sentinel.clean || "Génère 3 personas pour m'aider.",
        schema
      );
      
      if (result?.personas && Array.isArray(result.personas) && result.personas.length > 0) {
        return result.personas;
      }
      
      throw new Error("Empty or invalid personas array");
    } catch (error) {
      console.error("[AIService] Error generating personas, using fallbacks:", error);
      
      // Fallback Personas
      return [
        {
          name: "Aura Prime",
          icon: "Sparkles",
          attributes: {
            tone: ["analytical", "precise", "logical"],
            lexicon: ["technical", "structured", "clear"],
            abstraction: ["high", "medium", "low"],
            bias: ["neutral", "objective", "balanced"],
            signature: ["detailed", "concise", "bullet-points"]
          }
        },
        {
          name: "Echo",
          icon: "Zap",
          attributes: {
            tone: ["casual", "friendly", "empathetic"],
            lexicon: ["simple", "direct", "warm"],
            abstraction: ["low", "medium", "high"],
            bias: ["optimistic", "supportive", "encouraging"],
            signature: ["short", "expressive", "conversational"]
          }
        },
        {
          name: "Nova",
          icon: "Brain",
          attributes: {
            tone: ["creative", "visionary", "inspiring"],
            lexicon: ["poetic", "metaphorical", "rich"],
            abstraction: ["high", "very high", "medium"],
            bias: ["innovative", "forward-thinking", "bold"],
            signature: ["quirky", "deep", "thought-provoking"]
          }
        }
      ];
    }
  },

  /**
   * Helper pour obtenir un persona avec uniquement les variances par défaut (index 0).
   */
  getPersonaWithDefaultVariances(persona: Persona): Persona {
    const defaultAttributes: Record<string, string> = {};
    if (persona.attributes) {
      Object.entries(persona.attributes).forEach(([key, value]) => {
        defaultAttributes[key] = Array.isArray(value) ? value[0] : value;
      });
    }
    return {
      ...persona,
      attributes: defaultAttributes
    };
  },

  /**
   * S2 — Répond en streaming en incarnant un persona avec sa mémoire.
   */
  async *streamS2Response(
    userMessage: string,
    persona: Persona,
    memory: MemoryBank,
    history: ChatMessage[],
    userId: string
  ): AsyncGenerator<string> {
    const sentinel = SentinelGuard.sanitize(userMessage);
    SentinelGuard.logThreat(userId, sentinel);

    const systemPrompt = ContextBuilder.buildS2SystemPrompt(persona, memory);
    const formattedHistory: { role: "user" | "model"; parts: string }[] = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: m.content,
    }));

    yield* adapter.streamGenerate(systemPrompt, sentinel.clean, formattedHistory);
  },

  /**
   * MODE DÉBAT — Deux personas répondent en parallèle.
   * Retourne deux générateurs indépendants.
   */
  streamDebate(
    userMessage: string,
    personaA: Persona,
    personaB: Persona,
    memory: MemoryBank,
    history: ChatMessage[],
    userId: string
  ): [AsyncGenerator<string>, AsyncGenerator<string>] {
    const sentinel = SentinelGuard.sanitize(userMessage);
    SentinelGuard.logThreat(userId, sentinel);

    const formattedHistory: { role: "user" | "model"; parts: string }[] = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: m.content,
    }));

    const streamA = adapter.streamGenerate(
      ContextBuilder.buildS2SystemPrompt(personaA, memory),
      sentinel.clean,
      formattedHistory
    );
    const streamB = adapter.streamGenerate(
      ContextBuilder.buildS2SystemPrompt(personaB, memory),
      sentinel.clean,
      formattedHistory
    );

    return [streamA, streamB];
  },

  /**
   * Génère un résumé automatique de session (3 phrases).
   */
  async summarizeSession(messages: ChatMessage[], persona: Persona): Promise<{ summary: string; quote: string }> {
    const transcript = messages
      .slice(-20) // 20 derniers messages max
      .map(m => `${m.role === 'user' ? 'User' : persona.name}: ${m.content}`)
      .join('\n');

    const result = await adapter.generateStructured<{ summary: string; quote: string }>(
      `Tu résumes des conversations de chat en 2-3 phrases concises.
       Réponds uniquement en JSON avec les champs "summary" (2-3 phrases) et "quote" (citation représentative du persona).`,
      `Voici la conversation :\n${transcript}`,
      { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, quote: { type: Type.STRING } } }
    );
    return result;
  },
};
