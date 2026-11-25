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

// Confere o começo do arquivo, e não só o nome: um arquivo qualquer renomeado para .m4a não passa.
// Assinaturas dos formatos aceitos pela transcrição.
export function looksLikeAudio(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  const ascii = (inicio: number, fim: number) => buffer.toString('latin1', inicio, fim);

  return (
    ascii(4, 8) === 'ftyp' || // M4A, MP4 (o que o app grava)
    ascii(0, 3) === 'ID3' || // MP3 com etiqueta
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) || // MP3/MPEG sem etiqueta
    (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') || // WAV
    ascii(0, 4) === 'OggS' || // OGG, OPUS
    ascii(0, 4) === 'fLaC' || // FLAC
    (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) // WEBM
  );
}

// Tipo guardado no armazenamento, tirado da extensão aceita e nunca do que o celular declarou.
const CONTENT_TYPES: Record<string, string> = {
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.mpeg': 'audio/mpeg',
  '.mpga': 'audio/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm'
};

export function audioContentType(extension: string): string {
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}
