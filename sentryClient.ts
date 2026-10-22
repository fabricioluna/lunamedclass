// Ponte para o carregamento sob demanda em sentry.ts: `import('@sentry/react')` direto traz o
// pacote inteiro (replay, feedback — ~160 KB gzip); importando só o que o app usa, o bundler
// consegue descartar o resto.
export { init, captureConsoleIntegration, captureReactException } from '@sentry/react';
