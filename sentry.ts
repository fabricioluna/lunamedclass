import * as Sentry from '@sentry/react';

// Chamado uma vez, no topo de index.tsx, antes de renderizar o app.
//
// A DSN não é um segredo — é o mesmo padrão da chave pública do Firebase
// (ver .env.example): ela só permite ENVIAR eventos de erro para o projeto Sentry, não dá
// acesso de leitura a nada. Por isso pode ir com prefixo VITE_ (embutida no bundle público)
// sem violar a regra de "nunca prefixar segredo com VITE_" do projeto.
//
// Só inicializa em produção: em dev, os erros já aparecem no console/terminal do Vite, e não
// queremos que testes locais poluam o painel do Sentry.
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !import.meta.env.PROD) return;

  Sentry.init({
    dsn,
    // Só rastreamento de erro, sem performance monitoring — mantém o volume de eventos
    // baixo o suficiente para o plano gratuito de uma turma piloto.
    tracesSampleRate: 0,
    integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
  });
}
