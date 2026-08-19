export interface ProjectHealthMetrics {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  unstartedIssues: number;
  backlogIssues: number;
  completionRate: number;
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  overdueCount: number;
  unassignedCount: number;
  healthScore: number;
  healthStatus: 'Healthy' | 'At Risk' | 'Critical';
  keyInsights: string[];
}

/**
 * Calculates project health metrics, priority distribution, overdue count, and AI health score.
 */
export function calculateProjectHealth(
  issues: any[],
  states?: any[],
  nowDate: Date = new Date()
): ProjectHealthMetrics {
  if (!issues || issues.length === 0) {
    return {
      totalIssues: 0,
      completedIssues: 0,
      inProgressIssues: 0,
      unstartedIssues: 0,
      backlogIssues: 0,
      completionRate: 0,
      priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0, none: 0 },
      overdueCount: 0,
      unassignedCount: 0,
      healthScore: 100,
      healthStatus: 'Healthy',
      keyInsights: ['Belum ada work items untuk dianalisis.'],
    };
  }

  const stateGroupMap = new Map<string, string>();
  if (states) {
    for (const s of states) {
      if (s.id) {
        stateGroupMap.set(s.id, s.group?.toLowerCase() || s.name.toLowerCase());
      }
    }
  }

  let completed = 0;
  let inProgress = 0;
  let unstarted = 0;
  let backlog = 0;
  let overdue = 0;
  let unassigned = 0;

  const priorityBreakdown = { urgent: 0, high: 0, medium: 0, low: 0, none: 0 };
  const todayStr = nowDate.toISOString().slice(0, 10);

  for (const issue of issues) {
    const stateStr = typeof issue.state === 'string' ? issue.state : '';
    const group = (stateStr ? stateGroupMap.get(stateStr) : '') || stateStr.toLowerCase();

    if (group === 'completed' || group === 'done') {
      completed++;
    } else if (group === 'started' || group === 'in_progress' || group === 'in progress') {
      inProgress++;
    } else if (group === 'unstarted') {
      unstarted++;
    } else {
      backlog++;
    }

    // Priority
    const p = (issue.priority || 'none').toLowerCase();
    if (p in priorityBreakdown) {
      priorityBreakdown[p as keyof typeof priorityBreakdown]++;
    } else {
      priorityBreakdown.none++;
    }

    // Overdue
    const targetDate = issue.target_date || issue.due_date;
    if (targetDate) {
      const due = String(targetDate).slice(0, 10);
      if (due < todayStr && group !== 'completed' && group !== 'done' && group !== 'cancelled') {
        overdue++;
      }
    }

    // Unassigned
    const assignees = issue.assignees || issue.assignee_ids || [];
    if (!assignees || assignees.length === 0) {
      unassigned++;
    }
  }

  const total = issues.length;
  const completionRate = Math.round((completed / total) * 100);

  // Deduct health points for overdue tasks, urgent unassigned, low completion
  let penalty = 0;
  if (overdue > 0) penalty += Math.min(30, overdue * 10);
  if (priorityBreakdown.urgent > 0) penalty += Math.min(20, priorityBreakdown.urgent * 5);
  if (completionRate < 50) penalty += 15;

  const healthScore = Math.max(0, 100 - penalty);
  const healthStatus: 'Healthy' | 'At Risk' | 'Critical' =
    healthScore >= 80 ? 'Healthy' : healthScore >= 50 ? 'At Risk' : 'Critical';

  const keyInsights: string[] = [];
  if (completionRate >= 75) {
    keyInsights.push(`🚀 Laju penyelesaian task sangat baik (${completionRate}% selesai).`);
  } else if (completionRate < 40) {
    keyInsights.push(`⚠️ Kecepatan eksekusi perlu ditingkatkan (baru ${completionRate}% selesai).`);
  }

  if (overdue > 0) {
    keyInsights.push(`⏰ Terdapat ${overdue} task yang telah melewati batas tenggat (overdue).`);
  }

  if (unassigned > 0) {
    keyInsights.push(`🎟️ Ada ${unassigned} task yang belum memiliki penanggung jawab (unassigned).`);
  }

  if (priorityBreakdown.urgent > 0) {
    keyInsights.push(`🔥 Terdapat ${priorityBreakdown.urgent} task berprioritas Urgent yang membutuhkan perhatian segera.`);
  }

  if (keyInsights.length === 0) {
    keyInsights.push('✅ Seluruh indikator project berjalan stabil dan sehat.');
  }

  return {
    totalIssues: total,
    completedIssues: completed,
    inProgressIssues: inProgress,
    unstartedIssues: unstarted,
    backlogIssues: backlog,
    completionRate,
    priorityBreakdown,
    overdueCount: overdue,
    unassignedCount: unassigned,
    healthScore,
    healthStatus,
    keyInsights,
  };
}
