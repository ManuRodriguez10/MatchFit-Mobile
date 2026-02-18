import { supabase } from '@/lib/supabase';

export interface InviteLookupTeam {
  id: string;
  name: string;
}

type InviteLookupResult =
  | { ok: true; team: InviteLookupTeam }
  | { ok: false; reason: 'invalid_code' | 'lookup_unavailable'; message?: string };

function isMissingInviteRpc(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false;

  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    error.code === '42883' ||
    error.code === 'PGRST202' ||
    text.includes('find_team_by_invite_code') ||
    text.includes('function') && text.includes('not found')
  );
}

export async function lookupTeamByInviteCode(inviteCode: string): Promise<InviteLookupResult> {
  const cleaned = inviteCode.trim().toUpperCase();

  const { data, error } = await supabase.rpc('find_team_by_invite_code', {
    p_code: cleaned,
  });

  if (!error) {
    const team = Array.isArray(data) && data.length > 0 ? (data[0] as InviteLookupTeam) : null;
    if (!team) {
      return { ok: false, reason: 'invalid_code' };
    }
    return { ok: true, team };
  }

  // Fallback for environments where teams lookup is allowed directly.
  const { data: fallbackTeam, error: fallbackError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('invite_code', cleaned)
    .maybeSingle();

  if (!fallbackError && fallbackTeam) {
    return { ok: true, team: fallbackTeam };
  }

  if (isMissingInviteRpc(error)) {
    return {
      ok: false,
      reason: 'lookup_unavailable',
      message:
        'Team lookup is not configured in this environment yet. Apply the latest Supabase migrations and try again.',
    };
  }

  return {
    ok: false,
    reason: 'lookup_unavailable',
    message: error.message || 'Could not validate team code right now. Please try again.',
  };
}
