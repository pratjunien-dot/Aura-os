import { AIService } from '../ai/AIService';
import { GeminiAdapter } from '../ai/GeminiAdapter';
import type { Persona, ChatMessage, TopicUpdate, Preference } from '@/types';
import { Type } from '@google/genai';
import { db } from '@/firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

// We need a separate adapter instance for background tasks if we don't want to expose it in AIService
const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY || '');

const TOPIC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['label', 'keyPoints']
      }
    }
  }
};

export class MemoryAnalyzer {

  /**
   * Point d'entrée principal — appelé dans useHistory.ts à la fermeture de session.
   * Tourne en background, ne throw jamais vers l'UI.
   */
  static async analyzeAndPersist(
    sessionId: string,
    userId: string,
    personaId: string, // Actually the persona name for now
    messages: ChatMessage[],
    persona: Persona
  ): Promise<void> {
    try {
      const [topics, preferences, coherence] = await Promise.all([
        MemoryAnalyzer.extractTopics(messages),
        MemoryAnalyzer.inferPreferences(messages),
        MemoryAnalyzer.scoreCoherence(messages, persona),
      ]);

      console.log('[MemoryAnalyzer] Analysis complete:', { topics, preferences, coherence });

      // Find the favorite persona ID based on name
      const favRef = collection(db, `users/${userId}/favoritePersonas`);
      const q = query(favRef, where("name", "==", personaId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn(`[MemoryAnalyzer] Persona ${personaId} not found in favorites. Skipping memory persistence.`);
        return;
      }

      const favoriteId = snapshot.docs[0].id;
      const memoryRef = `users/${userId}/favoritePersonas/${favoriteId}`;

      // Persist Topics
      for (const topic of topics) {
        await addDoc(collection(db, `${memoryRef}/memory_topics`), {
          ...topic,
          lastDiscussed: serverTimestamp()
        });
      }

      // Persist Preferences
      for (const pref of preferences) {
        await addDoc(collection(db, `${memoryRef}/memory_preferences`), {
          ...pref
        });
      }

      // Persist Session Summary
      const { summary, quote } = await AIService.summarizeSession(messages, persona);
      await addDoc(collection(db, `${memoryRef}/memory_sessions_summary`), {
        summary,
        quote,
        coherenceScore: coherence,
        createdAt: serverTimestamp()
      });

    } catch (err) {
      // Silencieux — l'analyse est best-effort, jamais critique
      console.warn('[MemoryAnalyzer] Background analysis failed:', err);
    }
  }

  private static async extractTopics(messages: ChatMessage[]): Promise<TopicUpdate[]> {
    // Appel Gemini léger pour identifier les thèmes principaux
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    if (!userMessages) return [];

    return adapter.generateStructured<{ topics: TopicUpdate[] }>(
      `Identifie les 1 à 3 thèmes principaux de cette conversation.
       Pour chaque thème : un label court (3 mots max) et 2 points clés.
       Réponds en JSON.`,
      userMessages,
      TOPIC_SCHEMA
    ).then(r => r.topics.map(t => ({ ...t, count: 1 })));
  }

  private static async inferPreferences(messages: ChatMessage[]): Promise<Preference[]> {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return [];
    
    const avgLength = userMsgs.reduce((s, m) => s + m.content.length, 0) / userMsgs.length;

    // Heuristiques simples (pas d'appel IA nécessaire)
    const prefs: Preference[] = [];

    if (avgLength > 300) prefs.push({ type: 'response_length', value: 'long', confidence: 0.7 });
    if (avgLength < 80)  prefs.push({ type: 'response_length', value: 'short', confidence: 0.75 });

    return prefs;
  }

  private static async scoreCoherence(
    messages: ChatMessage[],
    persona: Persona
  ): Promise<number> {
    const aiMessages = messages
      .filter(m => m.role === 'model')
      .map(m => m.content)
      .slice(0, 10);

    if (!aiMessages.length) return 1;

    const result = await adapter.generateStructured<{ score: number }>(
      `Évalue sur une échelle de 0 à 1 si ces réponses sont cohérentes avec ce persona :
       Nom: ${persona.name}, Attributs: ${JSON.stringify(persona.attributes)}.
       Un score de 1 = parfaitement cohérent. Réponds en JSON avec un champ "score".`,
      aiMessages.join('\n---\n'),
      { type: Type.OBJECT, properties: { score: { type: Type.NUMBER } } }
    );
    return result.score;
  }
}
