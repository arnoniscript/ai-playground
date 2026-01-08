import { db } from '../db/client.js';
import { User, Playground, AccessControlType } from '../types.js';

/**
 * Check if a user has access to a specific playground based on their role
 * and the playground's access control settings
 * 
 * Access Rules:
 * - Admins: Always have access
 * - Testers: Access based on playground settings (open, email_restricted, or explicit)
 * - Clients: ALWAYS need explicit authorization, regardless of playground being open/restricted
 * 
 * This allows public playgrounds to have specific clients authorized without making them private
 */
export async function userHasPlaygroundAccess(
  userId: string,
  playgroundId: string,
  userRole: string,
  userEmail: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  // Admins always have access
  if (userRole === 'admin') {
    return { hasAccess: true, reason: 'admin' };
  }

  // Get playground details
  const { data: playground, error } = await db
    .from('playgrounds')
    .select('id, access_control_type, restricted_emails, is_active')
    .eq('id', playgroundId)
    .single();

  if (error || !playground) {
    return { hasAccess: false, reason: 'playground_not_found' };
  }

  // Check if playground is active
  if (!playground.is_active) {
    return { hasAccess: false, reason: 'playground_inactive' };
  }

  const accessControlType = playground.access_control_type as AccessControlType;

  // CLIENTS: Always need explicit authorization, even for "open" playgrounds
  // This allows public playgrounds to authorize specific clients without becoming private
  if (userRole === 'client') {
    return await checkExplicitAuthorization(userId, playgroundId);
  }

  // TESTERS & OTHER ROLES: Handle based on access control type
  switch (accessControlType) {
    case 'open':
      // Public playground - all testers can access
      return { hasAccess: true, reason: 'open_access' };

    case 'email_restricted':
      // Check if user's email is in restricted_emails array
      const restrictedEmails = playground.restricted_emails || [];
      if (restrictedEmails.includes(userEmail)) {
        return { hasAccess: true, reason: 'email_allowed' };
      }
      return { hasAccess: false, reason: 'email_not_allowed' };

    case 'explicit_authorization':
      // Check explicit authorization table
      return await checkExplicitAuthorization(userId, playgroundId);

    default:
      return { hasAccess: false, reason: 'unknown_access_control' };
  }
}

/**
 * Check if user is explicitly authorized in playground_authorized_users table
 */
async function checkExplicitAuthorization(
  userId: string,
  playgroundId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  const { data: authorization, error } = await db
    .from('playground_authorized_users')
    .select('id')
    .eq('playground_id', playgroundId)
    .eq('user_id', userId)
    .single();

  if (error || !authorization) {
    return { hasAccess: false, reason: 'not_authorized' };
  }

  return { hasAccess: true, reason: 'explicitly_authorized' };
}

/**
 * Get all playgrounds a user has access to
 * Returns filtered list based on user role and access controls
 */
export async function getUserAccessiblePlaygrounds(
  userId: string,
  userRole: string,
  userEmail: string
): Promise<string[]> {
  // Admins see all playgrounds
  if (userRole === 'admin') {
    const { data: playgrounds } = await db
      .from('playgrounds')
      .select('id')
      .eq('is_active', true);
    
    return playgrounds?.map(p => p.id) || [];
  }

  // For clients, ONLY return explicitly authorized playgrounds
  if (userRole === 'client') {
    const { data: authorizations } = await db
      .from('playground_authorized_users')
      .select('playground_id')
      .eq('user_id', userId);

    const playgroundIds = authorizations?.map(a => a.playground_id) || [];
    
    // Also filter by is_active
    if (playgroundIds.length === 0) {
      return [];
    }

    const { data: activePlaygrounds } = await db
      .from('playgrounds')
      .select('id')
      .in('id', playgroundIds)
      .eq('is_active', true);

    return activePlaygrounds?.map(p => p.id) || [];
  }

  // For testers and other roles
  // Get all active playgrounds
  const { data: allPlaygrounds } = await db
    .from('playgrounds')
    .select('id, access_control_type, restricted_emails')
    .eq('is_active', true);

  if (!allPlaygrounds) {
    return [];
  }

  const accessibleIds: string[] = [];

  for (const playground of allPlaygrounds) {
    const accessControlType = playground.access_control_type as AccessControlType;

    switch (accessControlType) {
      case 'open':
        accessibleIds.push(playground.id);
        break;

      case 'email_restricted':
        const restrictedEmails = playground.restricted_emails || [];
        if (restrictedEmails.includes(userEmail)) {
          accessibleIds.push(playground.id);
        }
        break;

      case 'explicit_authorization':
        // Check if user is in authorized list
        const { data: auth } = await db
          .from('playground_authorized_users')
          .select('id')
          .eq('playground_id', playground.id)
          .eq('user_id', userId)
          .single();
        
        if (auth) {
          accessibleIds.push(playground.id);
        }
        break;
    }
  }

  return accessibleIds;
}

/**
 * Add user authorization to a playground
 */
export async function authorizeUserForPlayground(
  playgroundId: string,
  userId: string,
  authorizedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await db
    .from('playground_authorized_users')
    .insert({
      playground_id: playgroundId,
      user_id: userId,
      authorized_by: authorizedBy,
      notes: notes || null,
    });

  if (error) {
    // Check if it's a duplicate error
    if (error.code === '23505') {
      return { success: false, error: 'User already authorized for this playground' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove user authorization from a playground
 */
export async function removeUserAuthorizationFromPlayground(
  playgroundId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await db
    .from('playground_authorized_users')
    .delete()
    .eq('playground_id', playgroundId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all authorized users for a playground
 */
export async function getPlaygroundAuthorizedUsers(
  playgroundId: string
): Promise<any[]> {
  const { data, error } = await db
    .from('playground_authorized_users')
    .select(`
      *,
      user:users!playground_authorized_users_user_id_fkey(id, email, full_name, role),
      authorizer:users!playground_authorized_users_authorized_by_fkey(email, full_name)
    `)
    .eq('playground_id', playgroundId)
    .order('authorized_at', { ascending: false });

  return data || [];
}
