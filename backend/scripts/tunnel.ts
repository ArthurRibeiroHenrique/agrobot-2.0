import 'dotenv/config';
import { spawn, spawnSync } from 'child_process';
import path from 'path';

// Abre o backend local na internet, com HTTPS, no domínio fixo do ngrok. Assim o APK
// acessa o backend sem hospedagem, enquanto este computador estiver ligado.

const port = process.env.PORT ?? '3333';
const domain = (process.env.NGROK_DOMAIN ?? '')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

if (!domain) {
  console.error(
    'Preencha NGROK_DOMAIN no backend/.env com o domínio fixo do ngrok ' +
      '(ex.: nome-do-dominio.ngrok-free.app). Veja docs/12-gerar-apk.md.'
  );
  process.exit(1);
}

// No Windows, o ngrok da Microsoft Store fica num atalho que o PATH nem sempre
// encontra primeiro. NGROK_PATH permite indicar outro executável.
function findNgrok(): string | null {
  const candidates = [
    process.env.NGROK_PATH,
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'ngrok.exe')
      : null,
    'ngrok'
  ].filter((candidate): candidate is string => Boolean(candidate));

  return (
    candidates.find(
      (candidate) => spawnSync(candidate, ['version']).status === 0
    ) ?? null
  );
}

const ngrok = findNgrok();

if (!ngrok) {
  console.error(
    'ngrok não encontrado. Instale pela Microsoft Store ou em https://ngrok.com/download ' +
      'e rode "ngrok config add-authtoken SEU_TOKEN".'
  );
  process.exit(1);
}

console.log(`Backend na internet em https://${domain}/v1 (porta local ${port}).`);
console.log('Deixe esta janela e a do backend abertas. Ctrl+C fecha o túnel.\n');

const child = spawn(ngrok, ['http', `--url=${domain}`, port], {
  stdio: 'inherit'
});

child.on('exit', (code) => process.exit(code ?? 0));
