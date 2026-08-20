import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/client';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run accurate SQL aggregations across the entire ai_usage dataset
    const [totalAgg, todayAgg, recentLogs, distributionLogs] = await Promise.all([
      prisma.aiUsage.aggregate({
        _count: { id: true },
        _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
        _avg: { durationMs: true },
      }),
      prisma.aiUsage.aggregate({
        where: { timestamp: { gte: today } },
        _count: { id: true },
        _sum: { totalTokens: true },
      }),
      prisma.aiUsage.findMany({
        orderBy: { timestamp: 'desc' },
        take: 30,
      }),
      prisma.aiUsage.findMany({
        orderBy: { timestamp: 'desc' },
        take: 1000,
        select: { model: true, feature: true, totalTokens: true, timestamp: true },
      }),
    ]);

    // Exact Metrics
    const totalRequests = totalAgg._count.id || 0;
    const totalTokens = totalAgg._sum.totalTokens || 0;
    const todayRequests = todayAgg._count.id || 0;
    const todayTokens = todayAgg._sum.totalTokens || 0;
    const avgLatency = Math.round(totalAgg._avg.durationMs || 0);

    // Official Gemini Free Tier Limits: 1,500 Requests / Day (RPD), 15 Requests / Min (RPM)
    const FREE_TIER_DAILY_LIMIT = 1500;
    const FREE_TIER_RPM_LIMIT = 15;
    const rawPercent = (todayRequests / FREE_TIER_DAILY_LIMIT) * 100;
    const dailyQuotaUsedPercent = Math.min(100, Math.round(rawPercent * 10) / 10);

    // Model Distribution
    const modelMap: Record<string, { requests: number; tokens: number }> = {};
    for (const log of distributionLogs) {
      const m = log.model || 'gemini-2.5-flash-lite';
      if (!modelMap[m]) modelMap[m] = { requests: 0, tokens: 0 };
      modelMap[m].requests += 1;
      modelMap[m].tokens += log.totalTokens;
    }

    const totalDistRequests = distributionLogs.length || 1;
    const modelDistribution = Object.entries(modelMap).map(([model, data]) => ({
      model: model.replace('gemini-2.5-', ''),
      requests: data.requests,
      tokens: data.tokens,
      percent: Math.round((data.requests / totalDistRequests) * 100),
    }));

    // Feature Distribution
    const featureMap: Record<string, number> = {};
    for (const log of distributionLogs) {
      const f = log.feature || 'general';
      featureMap[f] = (featureMap[f] || 0) + 1;
    }

    const featureDistribution = Object.entries(featureMap).map(([feature, count]) => ({
      feature: feature.replace('intent_', '').replace('plan_', ''),
      count,
      percent: Math.round((count / totalDistRequests) * 100),
    }));

    // Time Series Trend Data for Charts (Chronological order)
    const trendLogs = [...recentLogs].reverse();
    const trendData = trendLogs.map((log, index) => {
      const d = new Date(log.timestamp);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      return {
        id: log.id,
        index: index + 1,
        time: timeStr,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        totalTokens: log.totalTokens,
        latency: log.durationMs,
        model: log.model.replace('gemini-2.5-', ''),
        feature: log.feature.replace('intent_', '').replace('plan_', ''),
      };
    });

    return Response.json({
      summary: {
        totalRequests,
        totalTokens,
        todayRequests,
        todayTokens,
        avgLatency,
        freeTierDailyLimit: FREE_TIER_DAILY_LIMIT,
        freeTierRpmLimit: FREE_TIER_RPM_LIMIT,
        dailyQuotaUsedPercent,
        estimatedCost: '$0.00 (Gemini Free Tier)',
      },
      modelDistribution,
      featureDistribution,
      trendData,
      recentLogs,
    });
  } catch (error) {
    console.warn('Failed to fetch AI telemetry from database, returning baseline:', error);
    return Response.json({
      summary: {
        totalRequests: 0,
        totalTokens: 0,
        todayRequests: 0,
        todayTokens: 0,
        avgLatency: 0,
        freeTierDailyLimit: 1500,
        freeTierRpmLimit: 15,
        dailyQuotaUsedPercent: 0,
        estimatedCost: '$0.00 (Gemini Free Tier)',
      },
      modelDistribution: [],
      featureDistribution: [],
      trendData: [],
      recentLogs: [],
    });
  }
}
