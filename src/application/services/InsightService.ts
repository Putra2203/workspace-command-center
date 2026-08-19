import { PlaneService } from '@/infrastructure/plane/PlaneClient';
import { computeMyDayBuckets } from '@/domain/work_items/my-day';

export interface DailyBriefingRecommendation {
  taskId: string;
  reason: string;
}

export interface DailyBriefingMetrics {
  active: number;
  dueToday: number;
  overdue: number;
  blocked: number;
}

export interface DailyBriefing {
  summary: string | null;
  metrics: DailyBriefingMetrics;
  recommendations: DailyBriefingRecommendation[];
}

export interface WeeklyReviewMetrics {
  completed7Days: number;
  created7Days: number;
  blockedCount: number;
  activeCount: number;
}

export interface WeeklyReview {
  summary: string | null;
  metrics: WeeklyReviewMetrics;
}

export class InsightService {
  constructor(private planeService: PlaneService) {}

  async getDailyBriefing(projectId: string, currentUserId: string | null): Promise<DailyBriefing> {
    const [issues, states] = await Promise.all([
      this.planeService.listIssues(projectId),
      this.planeService.listStates(projectId),
    ]);

    const { metrics, overdueIssues, dueTodayIssues } = computeMyDayBuckets(issues, states, currentUserId);

    const recommendations: DailyBriefingRecommendation[] = [
      ...overdueIssues.map(issue => ({ taskId: issue.id, reason: 'Overdue' })),
      ...dueTodayIssues.map(issue => ({ taskId: issue.id, reason: 'Due today' })),
    ];

    return {
      summary: null,
      metrics,
      recommendations,
    };
  }

  async getWeeklyReview(projectId: string, currentUserId: string | null, nowDate: Date = new Date()): Promise<WeeklyReview> {
    const [issues, states] = await Promise.all([
      this.planeService.listIssues(projectId),
      this.planeService.listStates(projectId),
    ]);

    const { metrics } = computeMyDayBuckets(issues, states, currentUserId);

    const sevenDaysAgo = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    let created7Days = 0;
    let completed7Days = 0;

    const stateGroupMap = new Map<string, string>();
    for (const s of states) {
      stateGroupMap.set(s.id, s.group?.toLowerCase() || s.name.toLowerCase());
    }

    for (const issue of issues) {
      if (currentUserId && issue.assignees && !issue.assignees.includes(currentUserId)) {
        continue;
      }

      if (issue.created_at && new Date(issue.created_at) >= sevenDaysAgo) {
        created7Days++;
      }

      const group = issue.state ? stateGroupMap.get(issue.state) : '';
      if (group === 'completed' && issue.updated_at && new Date(issue.updated_at) >= sevenDaysAgo) {
        completed7Days++;
      }
    }

    let summaryText: string | null = null;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide a concise 2-sentence weekly performance summary for a developer in Indonesian based on these metrics:
Completed in last 7 days: ${completed7Days} tasks
Created in last 7 days: ${created7Days} tasks
Currently active: ${metrics.active} tasks
Currently blocked: ${metrics.blocked} tasks`,
        });
        summaryText = typeof (res as any).text === 'function' ? (res as any).text() : (res as any).text;
      } catch (err) {
        console.warn('Weekly summary AI generation failed:', err);
      }
    }

    return {
      summary: summaryText,
      metrics: {
        completed7Days,
        created7Days,
        blockedCount: metrics.blocked,
        activeCount: metrics.active,
      },
    };
  }
}
