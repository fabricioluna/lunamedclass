# CLAUDE.md — Luna MedClass

Guia de padrões para quem (humano ou IA) for tocar este código. Não é um tour pela stack —
é a lista do que **não pode regredir**, decisões já erradas uma vez e corrigidas a duras penas.

**Antes de qualquer trabalho de reestruturação/arquitetura, ler `PLANO-REESTRUTURACAO.md`** —
é o documento de continuidade do projeto (auditoria, decisões D1–D8, progresso por etapa).
**Regra de ouro: nenhuma funcionalidade nova antes da Etapa 6 estar concluída.**

## As 3 regras inegociáveis

1. **Nenhum componente ou view importa `firebase` diretamente.** Toda leitura/escrita passa
   por `services/*Service.ts` (um arquivo por domínio: `authService`, `configService`,
   `questionsService`, `osceService`, `labService`, `materialsService`, `resultsService`,
   `surveyService`, `adminService`, `storageService`). Verificar com:
   ```bash
   grep -r "from '.*firebase'" views/ components/ features/
   ```
   Isso deve voltar vazio. É a garantia de que queries filtradas (regra 3) não viram uma
   exceção esquecida numa tela nova.

2. **Toda rota nova nasce protegida** (`<ProtectedRoute>` em `routes/AppRoutes.tsx`), a menos
   que seja uma exceção deliberada e documentada (`/survey`, `/calculators`, `/career-quiz`,
   `/medical-events`, `/simulators` — decisão D6, turma piloto com link público). Mesmo nas
   exceções, **a autoridade real de acesso é a Firestore Security Rule (`firestore.rules`),
   nunca um `if (user.role === 'admin')` dentro do componente** (D5: o campo `role` em
   `users/{uid}` é decorativo, só UI — qualquer regra que dependa dele pode ser burlada pelo
   próprio dono do documento). Exemplo real: `/survey-report` não tem `<ProtectedRoute>` na
   rota, mas `surveys/{id}` só permite `read` para quem tem o Custom Claim `admin` — um aluno
   que acesse a URL vê a tela vazia, não os dados. Admin de verdade vem **só** do Custom Claim
   `admin` no ID token (`scripts/set-admin-claim.mjs`), nunca de UID hardcoded ou de um campo
   gravável pelo próprio usuário.

3. **Todo dado de aluno é lido por query filtrada no servidor**, nunca "baixa a coleção
   inteira e filtra no cliente". Ex.: `quizResults` sempre com
   `where('userId', '==', uid)`, nunca `getDocs(collection(db, 'quizResults'))` sem filtro. A
   Security Rule de cada coleção em `firestore.rules` reforça isso do lado do servidor — as
   duas camadas (query filtrada + regra) têm que bater; se só uma existir, a outra tende a ser
   contornável.

## Lições que já custaram um incidente

- **`useAppConfig.ts` / `DataContext.tsx`**: qualquer mudança aqui precisa ser testada como
  **visitante deslogado**, não só como usuário autenticado. Um fix anterior (Etapa 2) fez a
  tela de login inteira parar de carregar em produção porque esperava dados que só um usuário
  logado consegue ler — visitante nunca recebia o snapshot e ficava preso no loading.
- **Campos de nota numéricos** (calculadoras, OSCE): sempre usar `toNumberComma` de
  `utils/gradeCalculations.ts`, nunca `parseFloat` puro. `parseFloat` não entende vírgula
  decimal (`"8,5"` virava `8`) e campo vazio virava `NaN`, que a UI mostrava como `"0.00"` —
  indistinguível de nota zero real.
- **`/api/chat`**: hoje tem rate limiting em memória por IP (`api/_lib/rateLimit.ts`) mas
  **nenhuma verificação de autenticação** — qualquer request HTTP direto é aceito. Rate
  limiting é mitigação de custo, não controle de acesso; não tratar como se já resolvesse
  "só usuário logado chama a IA".

## Convenções de código

- UI e mensagens de erro em **português**; nomes de variáveis/funções em inglês.
- Comentários só quando explicam o **porquê** (uma decisão não óbvia, um workaround, uma
  lição de incidente) — nunca o que o código já deixa claro pelo nome.
- `@typescript-eslint/no-explicit-any` é erro, não warning — não relaxar a regra para
  "destravar" um commit; tipar de verdade ou usar `unknown` com narrowing.
- Regra de negócio pura (fórmulas de nota, filtros, pontuação) vive em `utils/*.ts` com teste
  ao lado (`utils/nome.test.ts`), não como closure dentro de um componente — closures não são
  testáveis isoladamente (lição do 5.2).

## Comandos de verificação (rodar antes de considerar algo pronto)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint . — hoje 22 problemas pré-existentes conhecidos, ver PLANO
npm run test        # vitest run
npm run test:rules  # Firestore Security Rules no emulador
npm run build        # já inclui o typecheck
```

Mudança em `firestore.rules` **sempre** roda `npm run test:rules` antes de publicar no
console — é o que valida a regra 2/3 acima na prática, não só na intenção.
