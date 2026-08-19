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

export class InsightService {
  constructor(private planeService: PlaneService) {}

  /**
   * Deterministic-only for now: `summary` stays null since AI-generated text
   * is Phase 2+ work. `recommendations` surfaces overdue/due-today items —
   * real priority scoring (blockers, urgency weighting) lands in P1-03.
   */
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
}
