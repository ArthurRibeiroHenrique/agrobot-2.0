import { supabaseAdmin } from '../lib/supabase';

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
