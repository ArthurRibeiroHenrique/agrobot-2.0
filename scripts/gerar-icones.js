// Gera os ícones do AgroBot a partir de um desenho em SVG.
// Uso (o sharp não é dependência do projeto; instale numa pasta à parte):
//   npm i sharp@0.34.4 && node scripts/gerar-icones.js <pasta de saída>
// Depois copie icon, adaptive-icon, monochrome-icon e splash-icon para mobile/assets/images
// e os arquivos play-* para docs/loja.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const saida = process.argv[2];
fs.mkdirSync(saida, { recursive: true });

const VERDE = '#2E7D32';
const VERDE_ESCURO = '#1B5E20';
const VERDE_CLARO = '#A5D6A7';
const BRANCO = '#FFFFFF';

// Desenho num quadro de 1024: microfone branco com um broto saindo do topo.
// Centro em 512, ocupa de y=150 a y=850.
function desenho(cor = BRANCO, folha = VERDE_CLARO) {
  return `
    <path d="M512 300 C 505 240, 480 200, 420 185 C 395 230, 405 280, 445 298 C 470 308, 495 306, 512 300 Z" fill="${folha}"/>
    <path d="M512 300 C 512 220, 545 170, 620 140 C 655 200, 640 270, 590 300 C 560 312, 530 308, 512 300 Z" fill="${folha}"/>
    <rect x="402" y="290" width="220" height="330" rx="110" fill="${cor}"/>
    <path d="M322 540 A 190 190 0 0 0 702 540" fill="none" stroke="${cor}" stroke-width="44" stroke-linecap="round"/>
    <line x1="512" y1="730" x2="512" y2="830" stroke="${cor}" stroke-width="44" stroke-linecap="round"/>
    <line x1="402" y1="840" x2="622" y2="840" stroke="${cor}" stroke-width="44" stroke-linecap="round"/>
  `;
}

// Reduz e centraliza o desenho (escala em torno do centro do quadro).
function escalado(escala, conteudo) {
  const d = 512 * (1 - escala);
  // O desenho vai de y=140 a y=862; o centro visual fica em ~500, sobe um pouco para compensar.
  return `<g transform="translate(${d} ${d + 12 * escala}) scale(${escala})">${conteudo}</g>`;
}

function svg(largura, altura, corpo, fundo) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
    ${fundo ? `<rect width="100%" height="100%" fill="${fundo}"/>` : ''}
    ${corpo}
  </svg>`);
}

async function png(nome, buffer, tamanho) {
  let img = sharp(buffer);
  if (tamanho) img = img.resize(tamanho, tamanho);
  await img.png().toFile(path.join(saida, nome));
}

(async () => {
  // Ícone comum (iOS e Android antigo): fundo verde em todo o quadro.
  await png('icon.png', svg(1024, 1024, escalado(0.78, desenho()), VERDE));
  // Android adaptativo: só o desenho, dentro da área segura (66% do centro); o fundo vem do app.json.
  await png('adaptive-icon.png', svg(1024, 1024, escalado(0.56, desenho())));
  // Ícone monocromático do Android 13 (temas do sistema).
  await png('monochrome-icon.png', svg(1024, 1024, escalado(0.56, desenho(BRANCO, BRANCO))));
  // Tela de abertura: desenho branco sobre o fundo verde definido no app.json.
  await png('splash-icon.png', svg(1024, 1024, escalado(0.9, desenho())));
  // Play Store: ícone de 512 px.
  await png('play-icon-512.png', svg(1024, 1024, escalado(0.78, desenho()), VERDE), 512);

  // Play Store: imagem de destaque de 1024x500.
  const destaque = svg(
    1024,
    500,
    `<rect width="1024" height="500" fill="${VERDE}"/>
     <circle cx="230" cy="250" r="170" fill="${VERDE_ESCURO}"/>
     <g transform="translate(230 250) scale(0.36) translate(-512 -500)">${desenho()}</g>
     <text x="450" y="230" font-family="Segoe UI, Arial, sans-serif" font-size="96" font-weight="800" fill="${BRANCO}">AgroBot</text>
     <text x="452" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="38" fill="${VERDE_CLARO}">Seu diário agrícola por voz</text>
     <text x="452" y="350" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="${BRANCO}">Fale o que fez. O AgroBot anota.</text>`
  );
  await sharp(destaque).png().toFile(path.join(saida, 'play-destaque-1024x500.png'));

  // Prévia para aprovação: ícone comum, recorte redondo do adaptativo e abertura.
  const previa = svg(
    1500,
    560,
    `<rect width="1500" height="560" fill="#ECEFF1"/>
     <g transform="translate(40 60) scale(0.43)"><rect width="1024" height="1024" rx="180" fill="${VERDE}"/>${escalado(0.78, desenho())}</g>
     <g transform="translate(540 60) scale(0.43)"><circle cx="512" cy="512" r="512" fill="${VERDE}"/>${escalado(0.56 * 1.5, desenho())}</g>
     <g transform="translate(1040 20) scale(0.26)"><rect width="1640" height="2000" rx="80" fill="${VERDE}"/><g transform="translate(570 750) scale(0.5)">${desenho()}</g></g>`
  );
  await sharp(previa).png().toFile(path.join(saida, 'previa.png'));
  console.log('ok');
})();
