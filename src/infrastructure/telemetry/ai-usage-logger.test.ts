import { describe, it, expect, vi } from 'vitest';
import { logAiUsage } from './ai-usage-logger';
import { prisma } from '@/infrastructure/db/client';

vi.mock('@/infrastructure/db/client', () => ({
  prisma: {
    aiUsage: {
      create: vi.fn().mockResolvedValue({ id: 'usage-1' }),
    },
  },
}));

describe('logAiUsage', () => {
  it('records AI usage parameters into Prisma aiUsage model', async () => {
    await logAiUsage({
      feature: 'intent_parser',
      model: 'gemini-2.5-flash',
      inputTokens: 120,
      outputTokens: 45,
      durationMs: 350,
    });

    expect(prisma.aiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feature: 'intent_parser',
        model: 'gemini-2.5-flash',
        inputTokens: 120,
        outputTokens: 45,
        totalTokens: 165,
        durationMs: 350,
        success: true,
      }),
    });
  });
});
