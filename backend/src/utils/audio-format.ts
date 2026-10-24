import path from 'path';

// Formatos que a transcrição da OpenAI aceita, identificados pela extensão.
const SUPPORTED_EXTENSIONS = [
  '.flac',
  '.m4a',
  '.mp3',
  '.mp4',
  '.mpeg',
  '.mpga',
  '.oga',
  '.ogg',
  '.wav',
  '.webm'
];

// Áudios do WhatsApp chegam como .opus, que é o mesmo contêiner do .ogg.
const ALIASES: Record<string, string> = {
  '.opus': '.ogg'
};

// Devolve a extensão a usar no armazenamento, ou null se o formato não é aceito.
// Sem extensão, assume .m4a, que é o formato gravado pelo app.
export function normalizeAudioExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();

  if (!ext) return '.m4a';

  const normalized = ALIASES[ext] ?? ext;

  return SUPPORTED_EXTENSIONS.includes(normalized) ? normalized : null;
}
