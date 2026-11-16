import { supabaseAdmin } from '../lib/supabase';
import { HttpError } from '../utils/http-error';

const UNIQUE_VIOLATION = '23505';

export type SharePerson = {
  user_id: string;
  email: string | null;
  created_at: string;
};

// Donos cujos dados o usuário pode ver e editar: ele mesmo e quem compartilhou o
// diário com ele (tabela diary_shares).
export async function accessibleUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('diary_shares')
    .select('owner_id')
    .eq('member_id', userId);

  if (error) throw error;

  const owners = (data ?? [])
    .map((row) => row.owner_id as string)
    .filter((ownerId) => ownerId !== userId);

  return [userId, ...owners];
}

async function emailsOf(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin.rpc('user_emails', { p_ids: ids });

  if (error) throw error;

  return new Map(
    ((data ?? []) as { id: string; email: string }[]).map((row) => [row.id, row.email])
  );
}

// shared_with: quem vê o diário do usuário. shared_by: de quem o usuário vê o diário.
export async function listShares(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('diary_shares')
    .select('owner_id, member_id, created_at')
    .or(`owner_id.eq.${userId},member_id.eq.${userId}`)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  const otherId = (row: (typeof rows)[number]) =>
    row.owner_id === userId ? row.member_id : row.owner_id;
  const emails = await emailsOf([...new Set(rows.map(otherId))]);

  const person = (row: (typeof rows)[number]): SharePerson => ({
    user_id: otherId(row),
    email: emails.get(otherId(row)) ?? null,
    created_at: row.created_at
  });

  return {
    shared_with: rows.filter((row) => row.owner_id === userId).map(person),
    shared_by: rows.filter((row) => row.member_id === userId).map(person)
  };
}

// A pessoa precisa já ter conta no AgroBot (ter entrado no app ao menos uma vez).
export async function shareDiary(userId: string, email: string): Promise<SharePerson> {
  const { data: memberId, error: lookupError } = await supabaseAdmin.rpc(
    'user_id_by_email',
    { p_email: email }
  );

  if (lookupError) throw lookupError;

  if (!memberId) {
    throw new HttpError(
      404,
      'Não há conta no AgroBot com esse e-mail. Peça para a pessoa entrar no app uma vez e tente de novo.'
    );
  }

  if (memberId === userId) {
    throw new HttpError(400, 'Esse é o seu próprio e-mail.');
  }

  const { data, error } = await supabaseAdmin
    .from('diary_shares')
    .insert({ owner_id: userId, member_id: memberId })
    .select('member_id, created_at')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'Você já compartilha o diário com essa pessoa.');
    }

    throw error;
  }

  return {
    user_id: data.member_id,
    email: email.trim().toLowerCase(),
    created_at: data.created_at
  };
}

// O dono para de compartilhar com alguém.
export async function stopSharing(userId: string, memberId: string) {
  const { error } = await supabaseAdmin
    .from('diary_shares')
    .delete()
    .eq('owner_id', userId)
    .eq('member_id', memberId);

  if (error) throw error;
}

// Quem recebeu o acesso deixa de ver o diário de outra pessoa.
export async function leaveSharedDiary(userId: string, ownerId: string) {
  const { error } = await supabaseAdmin
    .from('diary_shares')
    .delete()
    .eq('owner_id', ownerId)
    .eq('member_id', userId);

  if (error) throw error;
}
