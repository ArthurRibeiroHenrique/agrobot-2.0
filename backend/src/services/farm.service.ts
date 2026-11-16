import { supabaseAdmin } from '../lib/supabase';
import { CreateFarmInput, CreateFieldInput } from '../schemas/farm.schema';
import { HttpError } from '../utils/http-error';
import { accessibleUserIds } from './sharing.service';

export type FieldRef = {
  id: string;
  name: string;
  crop: string | null;
};

// Inclui as propriedades de quem compartilhou o diário com o usuário.
export async function listFarms(userId: string) {
  const owners = await accessibleUserIds(userId);

  const { data, error } = await supabaseAdmin
    .from('farms')
    .select('id, name, city, state, created_at')
    .in('user_id', owners)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data;
}

export async function createFarm(userId: string, input: CreateFarmInput) {
  const { data, error } = await supabaseAdmin
    .from('farms')
    .insert({
      user_id: userId,
      name: input.name,
      city: input.city,
      state: input.state
    })
    .select('id, name, city, state, created_at')
    .single();

  if (error) throw error;

  return data;
}

export async function listFields(userId: string, farmId?: string) {
  const owners = await accessibleUserIds(userId);

  let query = supabaseAdmin
    .from('fields')
    .select('id, farm_id, name, crop, area_ha, created_at')
    .in('user_id', owners)
    .order('created_at', { ascending: true });

  if (farmId) {
    query = query.eq('farm_id', farmId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

export async function createField(userId: string, input: CreateFieldInput) {
  const owners = await accessibleUserIds(userId);

  const { data: farm, error: farmError } = await supabaseAdmin
    .from('farms')
    .select('id')
    .eq('id', input.farm_id)
    .in('user_id', owners)
    .maybeSingle();

  if (farmError) throw farmError;

  if (!farm) {
    throw new HttpError(404, 'Propriedade não encontrada');
  }

  const { data, error } = await supabaseAdmin
    .from('fields')
    .insert({
      user_id: userId,
      farm_id: input.farm_id,
      name: input.name,
      crop: input.crop,
      area_ha: input.area_ha ?? null
    })
    .select('id, farm_id, name, crop, area_ha, created_at')
    .single();

  if (error) throw error;

  return data;
}

// O talhão é do usuário ou de quem compartilhou o diário com ele.
export async function userCanUseField(
  userId: string,
  fieldId: string
): Promise<boolean> {
  const owners = await accessibleUserIds(userId);

  const { data, error } = await supabaseAdmin
    .from('fields')
    .select('id')
    .eq('id', fieldId)
    .in('user_id', owners)
    .maybeSingle();

  if (error) throw error;

  return data !== null;
}
