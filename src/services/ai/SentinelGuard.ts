/**
 * SentinelGuard — Protection contre les injections de prompt.
 *
 * Philosophie : on ne bloque pas l'utilisateur, on neutralise
 * les vecteurs d'injection tout en préservant le sens du message.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /forget\s+(everything|your\s+(persona|role|instructions?))/gi,
  /you\s+are\s+now\s+(a\s+)?(?!assistant)/gi,    // "You are now [X]" override
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /<\|im_start\|>/gi,
  /###\s*instruction/gi,
  /act\s+as\s+(if\s+you\s+are|a)\s+(?!helpful)/gi,
];

const MAX_PROMPT_LENGTH = 4000; // tokens approximatifs

export interface SentinelResult {
  clean: string;
  wasModified: boolean;
  threats: string[];
}

export class SentinelGuard {
  static sanitize(input: string): SentinelResult {
    const threats: string[] = [];
    let clean = input.trim();

    // 1. Longueur maximale
    if (clean.length > MAX_PROMPT_LENGTH) {
      clean = clean.slice(0, MAX_PROMPT_LENGTH);
      threats.push('TRUNCATED_LENGTH');
    }

    // 2. Patterns d'injection
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(clean)) {
        threats.push(`INJECTION_PATTERN: ${pattern.source.slice(0, 30)}`);
        clean = clean.replace(pattern, '[contenu retiré]');
      }
    }

    // 3. Normalisation des caractères de contrôle
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return {
      clean,
      wasModified: threats.length > 0,
      threats,
    };
  }

  static logThreat(userId: string, result: SentinelResult): void {
    if (result.wasModified) {
      console.warn(`[SENTINEL] User ${userId} — Threats: ${result.threats.join(', ')}`);
      // TODO: écrire dans Firestore users/{userId}/securityLogs si récurrent
    }
  }
}
