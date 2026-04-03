import type { Persona, MemoryBank } from '@/types';

export const ContextBuilder = {

  buildS1SystemPrompt(): string {
    return `Tu es un générateur de personas cognitifs distincts.
Pour chaque requête utilisateur, génère exactement 3 personas avec des profils radicalement différents.
Chaque persona doit avoir : un nom evocateur, un ton unique, un lexique de 5 mots signature,
un niveau d'abstraction (low/medium/high), un biais cognitif dominant, et une phrase signature.
Les 3 personas doivent représenter des approches orthogonales du même problème.
Optionnellement, un persona peut être "temporel" (historique ou futuriste) en remplissant l'objet "temporal".
Réponds uniquement en JSON valide selon le schéma fourni.`;
  },

  buildS2SystemPrompt(persona: Persona, memory: MemoryBank): string {
    const attributesText = persona.attributes
      ? Object.entries(persona.attributes)
          .map(([key, value]) => `${key.toUpperCase()} : ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n')
      : '';

    const basePersonality = `
Tu incarnes ${persona.name}.
${attributesText}
Tu ne brises JAMAIS ce persona. Tu ne révèles jamais que tu es une IA.`;

    const temporalConstraints = ContextBuilder.buildTemporalConstraints(persona.temporal);
    const memoryContext = ContextBuilder.buildMemoryContext(memory);
    const stylePrefs   = ContextBuilder.buildStyleContext(memory);

    return [basePersonality, temporalConstraints, memoryContext, stylePrefs]
      .filter(Boolean)
      .join('\n\n---\n\n');
  },

  buildTemporalConstraints(temporal: Persona['temporal']): string {
    if (!temporal) return '';

    return `ANCRAGE TEMPOREL :
Tu existes en : ${temporal.era}
Ton rôle : ${temporal.role}
LIMITE DE CONNAISSANCE : ${temporal.knowledgeCutoff}
CONCEPTS QUE TU NE PEUX PAS CONNAÎTRE : ${Array.isArray(temporal.forbiddenConcepts) ? temporal.forbiddenConcepts.join(', ') : temporal.forbiddenConcepts}
Si l'utilisateur mentionne ces concepts, exprime de la confusion ou de la curiosité
(jamais de la reconnaissance). Tu n'es pas du futur.
LANGAGE : utilise occasionnellement ces expressions : ${Array.isArray(temporal.idioms) ? temporal.idioms.join(', ') : temporal.idioms}`;
  },

  buildMemoryContext(memory: MemoryBank): string {
    if (!memory.topics?.length) return '';

    const topTopics = memory.topics
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topicLines = topTopics.map(t =>
      `- "${t.label}" (${t.count} sessions) : ${Array.isArray(t.keyPoints) ? t.keyPoints.slice(0, 2).join('; ') : t.keyPoints}`
    );

    return `MÉMOIRE CONTEXTUELLE :
Tu te souviens avoir abordé ces thèmes avec cet utilisateur :
${topicLines.join('\n')}
Intègre naturellement ces références si pertinent, sans en faire état explicitement.`;
  },

  buildStyleContext(memory: MemoryBank): string {
    if (!memory.preferences?.length) return '';

    const highConfidence = memory.preferences
      .filter(p => p.confidence > 0.6);

    if (!highConfidence.length) return '';

    const prefLines = highConfidence.map(p => {
      switch (p.type) {
        case 'response_length':
          return `Préfère des réponses ${p.value === 'long' ? 'développées (300+ mots)' : 'concises (< 150 mots)'}`;
        case 'formality':
          return `Adapte ton registre : ${p.value}`;
        case 'example_density':
          return `${p.value === 'high' ? 'Illustre systématiquement avec des exemples concrets' : 'Reste dans l\'abstraction, évite les exemples triviaux'}`;
        default: return '';
      }
    }).filter(Boolean);

    return `PRÉFÉRENCES APPRISES :\n${prefLines.join('\n')}`;
  },
};
