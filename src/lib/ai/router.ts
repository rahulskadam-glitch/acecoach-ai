import type { AiProvider, AiRequest, AiResponse } from "@/lib/ai/types";

export class AiRouter {
  constructor(private readonly providers: AiProvider[]) {}

  async generate<T>(request: AiRequest): Promise<AiResponse<T>> {
    const candidates = request.preferredProvider
      ? this.providers.filter((provider) => provider.id === request.preferredProvider)
      : this.providers.filter((provider) => provider.supports(request.task, request.sportId));

    if (!candidates.length) throw new Error(`No AI provider supports task: ${request.task}`);

    let lastError: unknown;
    for (const provider of candidates) {
      try {
        return await provider.generate<T>(request);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("All AI providers failed.");
  }
}
