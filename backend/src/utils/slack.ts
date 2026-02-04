import fetch from 'node-fetch';
import { config } from '../config.js';

const SLACK_LOOKUP_URL = 'https://slack.com/api/users.lookupByEmail';

export interface SlackMembershipResult {
  isMember: boolean;
  userId?: string;
  error?: string;
  skipped?: boolean;
}

export const isSlackIntegrationEnabled = () => Boolean(config.slack?.botToken);

export async function checkSlackMembership(email: string): Promise<SlackMembershipResult> {
  if (!isSlackIntegrationEnabled()) {
    return { isMember: false, skipped: true };
  }

  try {
    const response = await fetch(
      `${SLACK_LOOKUP_URL}?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.slack.botToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = (await response.json()) as {
      ok: boolean;
      user?: { id: string };
      error?: string;
    };

    if (data.ok && data.user) {
      return { isMember: true, userId: data.user.id };
    }

    if (data.error === 'users_not_found') {
      return { isMember: false };
    }

    console.error('Slack API error:', data.error);
    return { isMember: false, error: data.error };
  } catch (error) {
    console.error('Failed to check Slack membership:', error);
    return { isMember: false, error: 'request_failed' };
  }
}
