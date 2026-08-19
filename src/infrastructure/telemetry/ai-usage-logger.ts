import { prisma } from '@/infrastructure/db/client';

export interface AiUsageData {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success?: boolean;
  error?: string;
}

/**
 * Records token consumption and AI performance telemetry to Supabase Postgres.
 */
export async function logAiUsage(data: AiUsageData): Promise<void> {
  try {
    const inputTokens = data.inputTokens || 0;
    const outputTokens = data.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;

    await prisma.aiUsage.create({
      data: {
        feature: data.feature,
        model: data.model,
        inputTokens,
        outputTokens,
        totalTokens,
        durationMs: data.durationMs || 0,
        success: data.success ?? true,
        error: data.error || null,
      },
    });
  } catch (err) {
    console.warn('Failed to record AI usage telemetry log:', err);
  }
}
