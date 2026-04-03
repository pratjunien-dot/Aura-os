/**
 * StreamProcessor — Connecte le streaming Gemini à l'état React.
 * Gère l'accumulation des tokens et les callbacks de progression.
 */
export class StreamProcessor {
  private buffer = '';
  private onToken: (token: string) => void;
  private onComplete: (fullText: string) => void;
  private onError: (err: Error) => void;

  constructor(callbacks: {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (err: Error) => void;
  }) {
    this.onToken = callbacks.onToken;
    this.onComplete = callbacks.onComplete;
    this.onError = callbacks.onError;
  }

  async process(stream: AsyncGenerator<string>): Promise<void> {
    this.buffer = '';
    try {
      for await (const token of stream) {
        this.buffer += token;
        this.onToken(token);
      }
      this.onComplete(this.buffer);
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
