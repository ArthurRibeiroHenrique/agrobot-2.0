# Avaliação da interpretação por voz

Mede se a IA transforma a fala do produtor nos dados certos (hipótese 2).

## Como rodar

Na pasta `backend`, com `OPENAI_API_KEY` preenchida no `.env`:

```
npm run eval
```

O comando mostra os erros de cada caso, o acerto por campo e o total. A meta é 85% dos campos
essenciais corretos; abaixo disso o comando termina com erro. Cada execução consome a API de IA.

Rode sempre que mudar o prompt, o modelo ou as regras de montagem do rascunho.

## Casos

Os casos ficam em `cases.json`. Os que estão lá hoje são **frases escritas pela equipe**, só para
o comando funcionar. Para validar a hipótese é preciso trocá-los por gravações reais de produtores.

Cada caso tem:

- `id`: nome curto do caso
- `transcript`: a frase em texto (testa só a interpretação), **ou**
- `audio`: caminho de um arquivo de áudio relativo a esta pasta, por exemplo `audios/joao-01.m4a`
  (testa transcrição + interpretação)
- `today`: a data em que a frase foi dita, para resolver "ontem" e "hoje"
- `fields`: talhões cadastrados daquele produtor
- `expected`: o resultado correto. Só os campos listados são avaliados

Campos avaliados: `intent`, `activity_type`, `product`, `quantity`, `unit`, `field_name`,
`occurred_at`.

`intent` mede se a IA entendeu o que o produtor quis: `registro` (anotar no diário), `pergunta`,
`ambos` ou `incerto` (o app pergunta ao produtor).

## Encaminhamento ao técnico

```
npm run eval:assistant
```

Faz as perguntas de `assistant-cases.json` ao assistente, com um produtor fictício, e confere se
ele mandou procurar um técnico agrícola quando devia. A meta é 85% de acerto, e **nenhum**
encaminhamento pode faltar em assunto sensível (dose, mistura, carência, diagnóstico, intoxicação):
se faltar um, o comando termina com erro. O `reason` esperado é só informativo.

## Gravações reais

1. Criar a pasta `eval/audios` e salvar as gravações nela
2. Para cada gravação, ouvir e preencher o `expected` à mão
3. Incluir sotaques, ruído de fundo e termos regionais diferentes

Gravações de produtores são dados pessoais: só incluir com autorização, e avaliar se devem ir
para o repositório.
