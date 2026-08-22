import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Trava contra a recaída do incidente do commit `deb2a85`: o `content` do Tailwind não
// escaneava `features/` nem `routes/` — quase metade do app. Toda classe usada só lá dentro era
// descartada do CSS de produção, e isso passou meses sem ser notado porque só aparecia quando a
// classe era usada em UM lugar só (o botão "Médio" do flashcard saía branco).
//
// O risco não é o que já foi corrigido, é o futuro: criar uma pasta nova de componentes e
// esquecer de incluí-la aqui reintroduz o mesmo bug silencioso. Este teste falha nesse caso.

const RAIZ = join(__dirname);
const IGNORAR = new Set(['node_modules', 'dist', 'backups', '.git', 'scripts', 'api', 'public']);

const listarArquivosComClassName = (dir: string, encontrados: string[] = []): string[] => {
  for (const entrada of readdirSync(dir)) {
    if (IGNORAR.has(entrada)) continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      listarArquivosComClassName(caminho, encontrados);
      continue;
    }
    if (!/\.tsx?$/.test(entrada)) continue;
    if (/\.test\.tsx?$/.test(entrada)) continue;
    if (readFileSync(caminho, 'utf8').includes('className')) {
      encontrados.push(relative(RAIZ, caminho).split(sep).join('/'));
    }
  }
  return encontrados;
};

// Extrai os caminhos declarados em `content: [...]`, transformando cada glob no prefixo que ele
// cobre ("./features/**/*.{ts,tsx}" → "features/", "./App.tsx" → "App.tsx").
const lerCoberturaDoConfig = (): string[] =>
  Array.from(readFileSync(join(RAIZ, 'tailwind.config.js'), 'utf8').matchAll(/"\.\/([^"]+)"/g))
    .map((m) => m[1].replace(/\*\*.*$/, ''));

describe('cobertura do content no tailwind.config.js', () => {
  it('todo arquivo que usa className está dentro de alguma pasta escaneada', () => {
    const cobertura = lerCoberturaDoConfig();
    const arquivos = listarArquivosComClassName(RAIZ);

    // Se isto falhar, a lista impressa é de arquivos cujas classes Tailwind serão descartadas
    // do CSS de produção: inclua a pasta no `content` do tailwind.config.js.
    const descobertos = arquivos.filter(
      (arquivo) => !cobertura.some((prefixo) => arquivo === prefixo || arquivo.startsWith(prefixo))
    );

    expect(descobertos).toEqual([]);
  });

  it('o próprio teste está enxergando arquivos (não passou por varrer nada)', () => {
    expect(listarArquivosComClassName(RAIZ).length).toBeGreaterThan(10);
  });
});
