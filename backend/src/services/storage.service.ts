import crypto from 'crypto';
import path from 'path';

import { supabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';

export async function uploadAudio(input: {
  userId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}): Promise<string> {
  const ext = path.extname(input.originalName) || '.m4a';
  const storagePath = `${input.userId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_AUDIO_BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: input.mimeType,
      upsert: false
    });

  if (error) throw error;

  return storagePath;
}

export async function downloadAudio(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from(env.SUPABASE_AUDIO_BUCKET)
    .download(storagePath);

  if (error) throw error;

  return Buffer.from(await data.arrayBuffer());
}

export async function removeAudio(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_AUDIO_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}
