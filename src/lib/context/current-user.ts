import { PlaneService } from '@/infrastructure/plane/PlaneClient';

export interface CurrentUserContext {
  userId: string;
  name: string;
  email: string;
  planeMemberId: string;
  workspaceId: string;
}

/**
 * Resolves the identity of the Plane account backing this app's API key.
 * This app authenticates to Plane with a single server-side API key (no
 * per-request auth), so /users/me/ always returns the same account —
 * planeMemberId is set equal to userId since there is no separate
 * per-project membership row fetched here.
 */
export async function getCurrentUserContext(planeService: PlaneService): Promise<CurrentUserContext> {
  const user = await planeService.getMe();
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

  return {
    userId: user.id,
    name,
    email: user.email,
    planeMemberId: user.id,
    workspaceId: planeService.defaultWorkspaceSlug,
  };
}
