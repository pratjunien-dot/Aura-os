import { Persona, ChatMessage, Preset } from '@/types';
import { GeminiAdapter } from './GeminiAdapter';
import { Type } from '@google/genai';

const adapter = new GeminiAdapter(""); // API key handled internally by adapter

export class PersonaEngine {
  /**
   * Génère des presets dynamiques pour le moteur de persona.
   */
  static async generatePresets(count: number = 5): Promise<Preset[]> {
    const prompt = `
Génère ${count} presets pour un moteur de génération de persona IA.
Chaque preset doit avoir : un nom (label), un identifiant (id), une icône (icon), une description (description),
et entre 4 et 6 variables librement nommées avec leurs domaines de valeurs possibles.
Les variables peuvent être par exemple :
(NOM, TON, LEXIQUE, PHILOSOPHIE, PRISMES, SIGNATURE)
ou (MÉTIER, MISSION, TYPE_ANALYSE, BIAIS, DÉTAIL)
ou (DOMAINE, LEXIQUE, TYPE_RÉFLEXION, OBJECTIF, PHILOSOPHIE)
ou tout autre schéma pertinent.
Retourne UNIQUEMENT du JSON strict.
`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          icon: { type: Type.STRING },
          description: { type: Type.STRING },
          variables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                values: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "values"]
            }
          }
        },
        required: ["id", "label", "icon", "description", "variables"]
      }
    };

    try {
      const presets = await adapter.generateStructured<Preset[]>(
        prompt,
        '',
        schema
      );
      return presets;
    } catch (error) {
      console.error('[PersonaEngine] Error generating presets:', error);
      throw error;
    }
  }

  /**
   * Analyse le message de l'utilisateur et suggère le meilleur persona parmi les favoris.
   */
  static async suggestPersona(
    userMessage: string,
    favorites: Persona[],
    history: ChatMessage[]
  ): Promise<Persona | null> {
    if (favorites.length === 0) return null;

    const personasList = favorites.map(p => `- ${p.name}: ${p.attributes?.signature || ''}`).join('\n');
    const recentHistory = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `
Tu es le moteur d'orchestration d'AURA OS.
Ton rôle est de choisir le persona le plus adapté pour répondre au dernier message de l'utilisateur.

Personas disponibles :
${personasList}

Historique récent :
${recentHistory}

Dernier message :
User: ${userMessage}

Choisis le nom du persona le plus pertinent. Si aucun ne correspond vraiment, choisis le plus polyvalent.
Réponds uniquement en JSON avec le champ "selectedPersonaName".
`;

    try {
      const result = await adapter.generateStructured<{ selectedPersonaName: string }>(
        prompt,
        '',
        {
          type: Type.OBJECT,
          properties: {
            selectedPersonaName: { type: Type.STRING }
          }
        }
      );

      const selected = favorites.find(p => p.name === result.selectedPersonaName);
      return selected || favorites[0];
    } catch (error) {
      console.error('[PersonaEngine] Error suggesting persona:', error);
      return favorites[0];
    }
  }

  /**
   * Évalue la qualité de la réponse d'un persona (cohérence, ton, etc.)
   */
  static async scoreResponse(
    response: string,
    persona: Persona
  ): Promise<number> {
    const prompt = `
Évalue la réponse suivante selon sa fidélité au persona décrit.
Persona: ${persona.name}
Attributs: ${JSON.stringify(persona.attributes)}

Réponse:
"${response}"

Donne un score de 0 à 100 (100 étant parfait).
Réponds uniquement en JSON avec le champ "score".
`;

    try {
      const result = await adapter.generateStructured<{ score: number }>(
        prompt,
        '',
        {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER }
          }
        }
      );
      return result.score;
    } catch (error) {
      console.error('[PersonaEngine] Error scoring response:', error);
      return 80; // Default score
    }
  }
}
