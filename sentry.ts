import type { ErrorInfo } from 'react';

// Chamado uma vez, no topo de index.tsx, antes de renderizar o app.
//
// A DSN não é um segredo — é o mesmo padrão da chave pública do Firebase
// (ver .env.example): ela só permite ENVIAR eventos de erro para o projeto Sentry, não dá
// acesso de leitura a nada. Por isso pode ir com prefixo VITE_ (embutida no bundle público)
// sem violar a regra de "nunca prefixar segredo com VITE_" do projeto.
//
// Só inicializa em produção: em dev, os erros já aparecem no console/terminal do Vite, e não
// queremos que testes locais poluam o painel do Sentry.
//
// Carregado DEPOIS da primeira tela (item 6.19): o SDK são ~80 KB que todo aluno baixava antes
// de ver qualquer coisa. Custo aceito: console.error e erros globais dos primeiros segundos não
// chegam ao painel. Erro de renderização (ErrorBoundary) continua chegando — reportReactError
// força o carregamento na hora.
const dsn = import.meta.env.VITE_SENTRY_DSN;
const enabled = !!dsn && import.meta.env.PROD;

let sentryPromise: Promise<typeof import('./sentryClient')> | null = null;

const loadSentry = () => {
  if (!sentryPromise) {
    sentryPromise = import('./sentryClient').then((Sentry) => {
      Sentry.init({
        dsn,
        // Só rastreamento de erro, sem performance monitoring — mantém o volume de eventos
        // baixo o suficiente para o plano gratuito de uma turma piloto.
        tracesSampleRate: 0,
        integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
      });
      return Sentry;
    });
  }
  return sentryPromise;
};

export function initSentry(): void {
  if (!enabled) return;
  const start = () => { loadSentry().catch(() => {}); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 2000);
}

export function reportReactError(error: Error, errorInfo: ErrorInfo): void {
  if (!enabled) return;
  loadSentry()
    .then((Sentry) => Sentry.captureReactException(error, errorInfo))
    .catch(() => {});
}
