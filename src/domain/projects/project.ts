import type { PlaneProject } from '@/types/plane';

/**
 * Domain-level Project. Currently a thin alias over the Plane DTO — no
 * project-specific derived fields or validation exist yet. Diverge this
 * from PlaneProject once domain logic (e.g. health scoring) needs fields
 * or shapes the raw Plane API response doesn't provide directly.
 */
export type Project = PlaneProject;
