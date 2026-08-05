# Plano de Reestruturação — Luna MedClass

> **Documento de continuidade.** Registra auditoria, decisões e progresso da reestruturação
> iniciada em **2026-08-04**. Escrito para ser retomado do zero, sem contexto prévio de conversa.

---

## 📌 Como usar este documento

**Se você é o Claude retomando após um `/clear`:**

1. Leia este arquivo inteiro antes de agir — ele substitui o histórico da conversa.
2. Vá em **Status Atual** e identifique a etapa corrente.
3. As **Decisões Firmadas** já foram acordadas com o usuário. Não relitigue; se precisarem mudar, pergunte.
4. Marque `[x]` conforme concluir, e **atualize a seção Status Atual** antes do próximo `/clear`.
5. Regra de ouro do projeto: **nenhuma funcionalidade nova antes da Etapa 6.**

**Perfil do usuário:** Fabrício Luna, médico/educador. Constrói com apoio de IA, não é dev
profissional. Prefira explicações concretas (caminho de clique, o que colar onde) a jargão.
Sempre separe "o que só ele pode fazer" (consoles Firebase/Google Cloud/Vercel — não temos
acesso) de "o que o Claude faz" (código).

---

## 🎯 Contexto do Projeto

Portal acadêmico de medicina: simulados, estações OSCE, laboratório virtual, calculadoras,
quiz vocacional. Em uso por **turma piloto** (uso leve).

| Item | Valor |
|---|---|
| Stack | React 19 + Vite 6 + TypeScript 5.8 + Tailwind 3 + Firebase RTDB + Gemini |
| Deploy | Vercel · 1 serverless function: `api/chat.ts` |
| Tamanho | ~13.600 linhas TS/TSX em 54 arquivos |
| Projeto Firebase | `monitor-virtual-fms` |
| RTDB | `https://monitor-virtual-fms-default-rtdb.firebaseio.com` |
| **UID admin** | `BFrlESQGtYZaYnxwTCdlXIidqfO2` |

---

## 🚦 Status Atual

**Etapa 0 (Emergência) — ✅ CONCLUÍDA e implantada em produção em 2026-08-04**

Commit `1271a2c`, push para `origin/main`, deploy automático da Vercel confirmado no ar.
Verificado em produção (`lunamedclass.vercel.app`) pelo **conteúdo** da resposta, não só o
status HTTP — `vercel.json` tem um catch-all para `/index.html`, então uma rota removida
retorna **200 com o HTML da SPA**, não 404. Não confiar em status code sozinho para validar
remoção de rota/função neste projeto.

- `curl` anônimo no RTDB → `Permission denied` (vazamento fechado)
- `POST /api/chat` → resposta válida da IA, `modelUsed: gemini-2.5-flash` (chave nova ativa)
- Chave antiga revogada no Google Cloud; `VITE_GEMINI_API_KEY` não existe mais em lugar nenhum
- `/api/test` → devolve o HTML da SPA (função removida, não existe mais endpoint público
  drenando a cota Gemini)
- `/ai-test` → cai no app normal (rota removida)
- Vulnerabilidades npm: 18 (2 críticas) → 2 (as 2 restantes exigem major bump do
  `react-router-dom`, adiado para a Etapa 1)

✅ **Atualização de 2026-08-04 (sessão seguinte):** os 3 itens que ficaram pendentes (0.5, 0.8,
0.9) foram todos fechados. 0.5 confirmado pelo usuário (chave trocada). 0.8 corrigido via script
(`scripts/fix-admin-profile.mjs`, perfil com os 6 campos que persistem — `photoURL: null` é
removido pelo próprio RTDB). 0.9 investigado e **não é corrigível**: dos 8233 registros em
`quizResults`, 8216 não têm nem `userEmail` nem `userId` gravados (são de antes da instrumentação
existir) — não é um caso de "casar por e-mail", é ausência total do dado. Ver seção ETAPA 0 abaixo
para detalhes. 🔴 Pendência nova: a service account key usada nos dois scripts foi colada em
texto plano nesta conversa — recomendado revogá-la (ver nota de segurança na seção 0.9).

**Etapa 1 (Rede de proteção) — ✅ CONCLUÍDA, commitada e enviada em 2026-08-04.**

Commit `215d02d`, push para `origin/main`.

- `tailwind.config.js`: `content` deixou de varrer `node_modules` → build 3m37s → **17s**
- `tsconfig.json`: `strict: true` + `include` explícito → **0 erros** (o número de 13 na tabela de
  auditoria abaixo é da leitura pré-Etapa 0; algo no meio do caminho já corrigiu ou o comando ad
  hoc da auditoria não usava o mesmo `tsconfig`. Re-auditar em 2.7/2.8 se reaparecer)
- `package.json`: `typecheck` roda antes do `build`; scripts novos `lint`, `test`, `format`,
  `format:check`
- ESLint 9 (flat config, `eslint.config.js`) + Prettier (`.prettierrc.json`) +
  `eslint-plugin-react-hooks` — só as regras clássicas (`rules-of-hooks` erro,
  `exhaustive-deps` warn); as regras novas de React Compiler (`purity`,
  `set-state-in-effect`, `immutability`) do plugin v7 foram **deixadas de fora** de propósito,
  fora do escopo auditado
  - `npm run lint` hoje: **92 erros, 47 warnings** — batem com os 80 `any` e ~22 órfãos já
    conhecidos da auditoria (vira trabalho da Etapa 2, itens 2.7/2.8/2.10)
  - Prettier configurado mas **não aplicado** ao repo inteiro ainda (66 arquivos sem
    formatação padronizada) — rodar `npm run format` é decisão separada, para não poluir os
    commits isolados da Etapa 2 com diff de formatação
- `.github/workflows/ci.yml`: typecheck + lint + test + build em push/PR para `main`.
  **CI vai ficar vermelho** até a Etapa 2 (lint com 92 erros) — é o comportamento esperado, igual
  ao build local
- Vitest + Testing Library: `vite.config.ts` ganhou bloco `test` (jsdom), `vitest.setup.ts`
  carrega `@testing-library/jest-dom`. 2 testes de fumaça, 4 casos, todos passando:
  `utils/csvHelper.test.ts` (função pura) e `components/DisciplineCard.test.tsx` (render + clique)

🆕 **Achado novo durante 1.4** (fora do escopo desta etapa, registrado para a Etapa 2): hook
condicional em `views/OsceView.tsx:217` — o `useEffect` do timer vem depois de um `return`
antecipado (linha 209) quando `station.mode !== 'clinical'`, violando a regra de hooks. Ver
item **2.11** abaixo.

**Etapa 2 (Correção de erros) — ✅ CONCLUÍDA em 2026-08-04**, incluindo o item de limpeza de
`any` (2.12), ver nota abaixo.

- [x] 2.1, 2.3, 2.4 — race no cadastro, perda de protótipo do FirebaseUser, perfil congelado
  (commit `6b773a4`)
- [x] 2.2 — fluxo morto "Compartilhar Material" removido, não redirecionado (commit `b002a14`)
- [x] 2.5, 2.6 — listeners vazados fechados, `isLoading` ligado à chegada real dos dados
  (commit `f4807a8`)
- [x] 2.11 — hook condicional em `OsceView.tsx`, achado em 1.4 (commit `e2946b4`)
- [x] 2.7, 2.8 — checados, não reproduziram no código atual (nada a commitar)
- [x] 2.9 — `medicalEventsData.ts` removido (commit `acbc332`)
- [x] 2.10 — 28 imports/variáveis/parâmetros órfãos removidos (commit `3ac6444`)

🔴 **Incidente em produção causado pelo fix 2.5/2.6, corrigido no mesmo dia (commit
`6db9642`).** O fix original fazia `isLoading` esperar `periods` e `disciplines` responderem
antes de liberar o app — mas as Security Rules exigem `auth != null` para ler os dois, e um
visitante deslogado nunca recebe esse snapshot. Resultado: **a própria tela de login parou de
carregar em produção** (todo mundo, não só um caso de borda). Detectado durante o teste de
cadastro ponta a ponta desta sessão (Playwright headless contra o bundle publicado, comparado por
hash com o build local). Corrigido com callback de erro no `onValue` que também libera o
`isLoading`, caindo no fallback via `constants` já usado como estado inicial — mantém a correção
original (isLoading não é mais um timer cego) sem travar quando a leitura é negada por design.
Verificado local (Playwright) e em produção (bundle novo no ar, tela de login renderizando) antes
de seguir. **Lição:** depois de qualquer mudança em `useFirebaseData`/`DataContext`, testar a
carga como visitante deslogado, não só como usuário autenticado — é fácil esquecer que a tela de
login roda sem `auth`.

✅ **Cadastro testado ponta a ponta em produção**, com Playwright contra
`lunamedclass.vercel.app` (conta `qa.claude.etapa2.*@example.com`, senha só nesta sessão — pode
apagar em Firebase Console → Authentication → buscar pelo e-mail, e o nó correspondente em
`users/{uid}` no RTDB): cadastro → perfil completo com nome cheio (não truncado como no bug 0.8)
→ logout implícito → login de novo → `/dashboard` carregando com XP 0, sem erros de console. Foi
justamente esse teste que expôs o incidente do `isLoading` documentado acima.

🟢 **Decisão sobre os 79 `any`: adiado como item novo, não é bug — ver 2.12 abaixo.** Não estava
na lista original da Etapa 2 (é uma regra do ESLint que eu mesmo configurei na Etapa 1; os "13
erros de tipo" do `tsc --strict` citados no plano são outra coisa e não reproduziram — ver
2.7/2.8). Relaxar a regra pra `warn` só pra deixar o CI verde hoje seria maquiar o sinal sem
resolver nada. Também não faz sentido tipar 79 pontos agora, no fim de uma sessão já longa e após
um incidente em produção — é exatamente o tipo de mudança grande e espalhada que pede atenção
fresca, não continuação por inércia.

- [x] **2.12** Tipados os 79 usos de `no-explicit-any` — Firebase snapshots, respostas da API
  Gemini, payloads de formulário admin. `npx eslint .` confirma **zero** ocorrências de
  `@typescript-eslint/no-explicit-any` *(concluído em 2026-08-04, commits `dd62b01`, `71cc905`,
  `66136a0`, `ee51ea0` — um por bloco temático, ver detalhamento abaixo)*.

  🟡 **Restam 26 problemas de lint pré-existentes (9 erros, 17 warnings)** — `prefer-const`,
  `no-empty`, `no-unused-vars`, `no-useless-assignment`, `react-hooks/exhaustive-deps`,
  `react-refresh/only-export-components`. Confirmado via `git stash` que já existiam antes desta
  sessão (baseline: 89 erros/17 warnings; a diferença de ~80 erros é exatamente o volume de
  `no-explicit-any`, configurado como `error`). **Não bloqueiam a Etapa 3** — são dívida de lint
  fora do escopo do 2.12, não comportamento incorreto. Considerar um item novo se incomodarem o CI.

**Detalhamento do 2.12 (4 blocos, 1 commit cada, `tsc`+`build`+`vitest` verde após cada um):**
  1. **IA/Gemini** (`api/chat.ts`, `aiService.ts`, `OsceAIView`, `DynamicOsceView`, `OsceView`,
     `QuizView`, + `InteractiveQuiz.tsx` preemptivo) — 35 `any` + 3. Novos tipos compartilhados em
     `types.ts`: `PhaseRules`, `AIChatResponse`. Em `api/chat.ts`, o `modelOptions` é passado à SDK
     do Gemini via `as unknown as ModelParams` — a SDK declara `SchemaType` em minúsculo
     (`"object"`), mas o formato maiúsculo (`"OBJECT"`) é o que já roda em produção desde a Etapa 0
     (`modelUsed: gemini-2.5-flash` confirmado); o cast preserva esse comportamento sem esconder o
     motivo atrás de um `any` solto.
  2. **Admin** (`AdminView.tsx` + 7 componentes de `components/admin/`) — 29 `any`.
  3. **Camada de dados** (`useFirebaseData.ts`, `DataContext.tsx`) — 3 `any` → `AnalyticsResult[]`.
     Mudança só de tipo, sem tocar lógica — **não precisou reteste como visitante deslogado**
     (ver `incidente-isloading-anonimo-2026-08` na memória: aquele incidente veio de lógica de
     `isLoading`, não de anotação de tipo).
  4. **UI diversa** (`App.tsx`, `CareerQuiz`, `CalculatorsView`, `SummariesListView`,
     `StudentDashboardView`) — 9 `any`. Dois casts em `App.tsx` eram redundantes (tipos já batiam)
     e foram só removidos.

Regra observada em todo o item: nenhuma mudança de comportamento, só tipos — quando um `any`
escondia uma inconsistência real (ex: `err.message` em `catch` sem narrowing), o fix usa
`error instanceof Error` em vez de mudar o que a mensagem de erro mostra. Nenhum bug novo
encontrado (diferente do que aconteceu com 2.11 na Etapa 1).

**➡️ Próxima ação: iniciar a Etapa 3** (camada de dados — Firestore, ponto de não-retorno, fazer
backup do RTDB antes). Commits do 2.12 estão locais, **não enviados ao remoto** (`git push`
pendente, decisão do usuário). Inventário original do 2.12, tirado com `npx eslint . --format
json` em 2026-08-04, preservado abaixo como referência histórica:

```
13 views/DynamicOsceView.tsx     [11,16,62,80,117,131,151,184,285,299,300,424,456]
11 views/AdminView.tsx           [46,54,55,56,57,58,59,59,59,60,293]
 7 api/chat.ts                   [3,3,37,60,78,100,112]
 7 components/admin/AdminStats.tsx [133,166,177,178,345,426,464]
 6 services/aiService.ts         [10,30,60,84,183,212]
 4 components/admin/AdminOsce.tsx [70,87,102,126]
 4 views/QuizView.tsx            [28,81,119,170]
 3 App.tsx                       [118,495,658]
 3 components/InteractiveQuiz.tsx [10,35,68]
 3 components/admin/AdminAnalytics.tsx [9,59,118]
 3 views/OsceView.tsx            [10,65,109]
 2 views/CalculatorsView.tsx     [176,178]
 2 views/OsceAIView.tsx          [9,67]
 2 views/SummariesListView.tsx   [48,198]
 1 components/CareerQuiz.tsx     [33]
 1 components/admin/AdminLab.tsx [157]
 1 components/admin/AdminMaterials.tsx [222]
 1 components/admin/AdminQuestions.tsx [149]
 1 components/admin/AdminReferences.tsx [50]
 1 contexts/DataContext.tsx      [16]
 1 hooks/useFirebaseData.ts      [22]
 1 types.ts                      [204]
 1 views/StudentDashboardView.tsx [108]
TOTAL: 79, 23 arquivos
```

**Estratégia sugerida — 4 blocos temáticos, um ou mais commits por bloco (não um commit gigante):**

1. **IA/Gemini** (`api/chat.ts`, `services/aiService.ts`, `views/OsceAIView.tsx`,
   `views/DynamicOsceView.tsx`, `views/OsceView.tsx`, `views/QuizView.tsx` — 35 ocorrências, o
   maior bloco). Tipar a forma da resposta da API Gemini (`functionCalls()[].args`,
   `response.text()`) e o estado de fases dinâmicas do OSCE. É o bloco de maior risco real —
   esses `any` escondem contratos de dados que já causaram bug antes (ver 2.7/2.8: o padrão
   `let x = null` que vira "evolving any").
2. **Admin** (`views/AdminView.tsx`, `components/admin/*` — 29 ocorrências). Provavelmente
   `useState<any>` em formulários e parsing de CSV/import. Menor risco (só usado pelo admin
   único, não pelos alunos).
3. **Camada de dados** (`hooks/useFirebaseData.ts`, `contexts/DataContext.tsx`, `types.ts` — 3
   ocorrências, mas estrutural: `osceAnalytics: any[]`). Vale checar se não é redundante com a
   Etapa 3 (Firestore) antes de investir tempo tipando algo que a Etapa 3 vai substituir.
4. **UI diversa** (`App.tsx`, `CareerQuiz.tsx`, `InteractiveQuiz.tsx`, `CalculatorsView.tsx`,
   `SummariesListView.tsx`, `StudentDashboardView.tsx` — 12 ocorrências). Mais simples, bom
   aquecimento.

Regras de sempre: nenhuma mudança de comportamento, só tipos — se tipar revelar um bug real
(como o `react-hooks/rules-of-hooks` de 2.11), abrir item novo em vez de misturar no mesmo
commit. Rodar `npx tsc --noEmit && npm run lint && npm run build && npx vitest run` depois de
cada bloco. **Lição do incidente do `isLoading`:** qualquer coisa que toque
`hooks/useFirebaseData.ts` ou `contexts/DataContext.tsx` precisa ser testada como visitante
deslogado, não só autenticado (ver `incidente-isloading-anonimo-2026-08` na memória).

Depois do 2.12, seguir para a **Etapa 3** (camada de dados — Firestore, ponto de não-retorno,
fazer backup do RTDB antes).

---

## 🔒 Decisões Firmadas

| # | Decisão | Motivo |
|---|---|---|
| D1 | Ordem das etapas é por **risco**, não por conveniência | Acordado explicitamente com o usuário |
| D2 | **Nenhuma funcionalidade nova antes da Etapa 6** | Pedido explícito do usuário |
| D3 | Consolidar tudo no **Firestore**; RTDB é aposentado na Etapa 3 | Permite query filtrada por usuário no servidor — resolve o vazamento na raiz |
| D4 | Admin identificado por **UID escrito direto nas regras** (interino) | Custom Claims exigem Admin SDK; fica para a Etapa 3. Nó `/admins` foi descartado por atrito de UI no console |
| D5 | Campo `role` em `users/` é **decorativo** (só UI) | Regras do RTDB cascateiam: não dá para proteger um campo dentro de nó que o próprio dono escreve |
| D6 | `/survey` continua pública (write-only); `/survey-report` vira admin | Link aberto para a turma |
| D7 | Gabarito visível a aluno logado é **limitação aceita** | Quiz client-side sempre expõe resposta no DevTools; corrigir exige correção server-side (Etapa 6) |
| D8 | Fechar vazamento tem precedência sobre quebrar feature | LGPD > dashboard fora do ar numa turma piloto |

---

## 🚨 ETAPA 0 — Emergência

- [x] **0.1** Identificar UID admin → `BFrlESQGtYZaYnxwTCdlXIidqfO2`
- [x] **0.2** ~~Criar nó `/admins`~~ — **descartado** (ver D4)
- [x] **0.3** Publicar regras restritivas no RTDB *(feito 2026-08-04)*
- [x] **0.4** Corrigir `StudentDashboardView` — query filtrada no servidor *(precisa de deploy)*
- [x] **0.5** Revogar e reemitir chave Gemini *(confirmado pelo usuário em 2026-08-04 — chave trocada)*
- [x] **0.6** Higiene: `npm audit fix`, `dist/` limpo, `.gitignore` e `.env.example`
- [x] **0.7** Versionar `database.rules.json` + `database.rules.README.md`
- [x] **0.8** Corrigir perfil admin incompleto no banco *(aplicado em produção, 2026-08-04)*
- [x] **0.9** Investigar backfill `userEmail` → `userId` *(rodado em produção, 2026-08-04 — ver
  achado abaixo: não havia nada a corrigir)*

**✅ Etapa 0 — CONCLUÍDA em 2026-08-04.**

### O que foi feito no código (2026-08-04)

| Arquivo | Mudança |
|---|---|
| `views/StudentDashboardView.tsx` | query `orderByChild('userId').equalTo(uid)` + callback de erro |
| `views/AITestView.tsx` | **removido** — expunha a chave Gemini em rota pública |
| `api/test.ts` | **removido** — endpoint público sem auth que gastava cota Gemini a cada acesso |
| `App.tsx` | removidos a rota `/ai-test` e o lazy import |
| `.env` | `VITE_GEMINI_API_KEY` removida; `GEMINI_API_KEY` zerada aguardando a chave nova |
| `.env.example` | criado — documenta a regra "nunca prefixe segredo com `VITE_`" |
| `.gitignore` | `dist`, `scripts/serviceAccount.json`, exceção para `.env.example` |
| `database.rules.json` + `.README.md` | regras versionadas e documentadas |
| `scripts/backfill-userid.mjs` | backfill com dry-run |
| `package.json` | `@google/genai` removido (dependência não usada; puxava as vulnerabilidades) |

**Vulnerabilidades npm: 18 (2 críticas) → 2 (high).** As 2 restantes são do `react-router-dom`
e exigem major bump com breaking change → adiadas para a Etapa 1, quando houver CI e testes.

**Build após as mudanças:** typecheck ✅ · build ✅ (1m14s) · `grep AIzaSy dist/` devolve só a
chave pública do Firebase.

### 0.4 — Dashboard *(Claude faz)*

`views/StudentDashboardView.tsx:24` baixa a coleção inteira `quizResults`. As novas regras só
liberam leitura com query filtrada — logo, hoje recebe `permission_denied`.

```diff
+ import { query, orderByChild, equalTo } from 'firebase/database';
- const resultsRef = ref(db, 'quizResults');
- const unsubscribe = onValue(resultsRef, (snapshot) => {
+ const q = query(ref(db, 'quizResults'), orderByChild('userId'), equalTo(currentUser.uid));
+ const unsubscribe = onValue(q, (snapshot) => {
```

⚠️ Resultados antigos gravados sem `userId` somem do dashboard. Verificar volume; se relevante,
escrever script de backfill (`userEmail` → `userId`).

### 0.5 — Chave Gemini *(usuário faz)*

A chave `AIzaSyCMWkGr…` está em texto claro no bundle público. **Revogar, não apenas trocar** —
a antiga continua válida enquanto não for revogada.

1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → projeto `monitor-virtual-fms`
2. Apagar a chave `AIzaSyCMWkGr…` (a IA do site para de funcionar — esperado)
3. Criar chave nova → Editar → Restringir a **Generative Language API**
4. Vercel → Settings → Environment Variables:
   - **apagar** `VITE_GEMINI_API_KEY` (é ela que vaza)
   - atualizar `GEMINI_API_KEY` com a chave nova

*(Claude, em paralelo:)*
- [ ] `rm views/AITestView.tsx`
- [ ] remover rota `/ai-test` (`App.tsx:685`) e lazy import (`App.tsx:29`)
- [ ] remover `VITE_GEMINI_API_KEY` de `.env` e `.env.local`

### 0.6 — Higiene *(Claude faz)*
```bash
npm audit fix          # 18 vulnerabilidades, 2 críticas
rm -rf dist            # bundle contém a chave antiga
echo "dist/" >> .gitignore
```

### 0.8 — Perfil admin quebrado *(✅ resolvido em 2026-08-04)*

O nó `users/BFrlESQGtYZaYnxwTCdlXIidqfO2` tinha **só** `role` e `lastLogin`. Era a race condition
do item **2.1** materializada em produção — evidência de que aquele bug era real, não teórico
(já corrigido em código desde o commit `6b773a4`, então não deve reincidir).

Resolvido com `scripts/fix-admin-profile.mjs` (dry-run + `--apply`, idempotente). Perfil
confirmado completo após a execução:
```json
{
  "createdAt": "2026-07-19T15:14:22.561Z",
  "displayName": "Fabrício Luna",
  "email": "fabricioluna@gmail.com",
  "lastLogin": "2026-07-19T15:14:22.561Z",
  "role": "admin",
  "uid": "BFrlESQGtYZaYnxwTCdlXIidqfO2"
}
```
`photoURL` não aparece: o RTDB trata `null` em `set`/`update` como "remover a chave", não "gravar
null" — isso vale para qualquer perfil (alunos incluídos) e é inofensivo aqui, já que nada lê
`photoURL` deste nó (o `Header` usa o Firebase Auth diretamente).

### 0.9 — Backfill `userEmail` → `userId` *(✅ investigado em 2026-08-04 — nada a corrigir)*

A hipótese original era "resultados antigos têm `userEmail` mas não `userId`". O dry-run de
`scripts/backfill-userid.mjs` contra o banco de produção mostrou outra coisa: dos 8233 registros
em `quizResults`, só 17 têm `userId` — e **nenhum dos outros 8216 tem `userEmail` para casar por
e-mail**. Amostra confirmou: registros de antes de ~19-26/07/2026 não gravam nenhum identificador
de aluno (nem e-mail, nem uid); só passaram a vir com os dois campos juntos a partir de então.

Não é um bug corrigível por script — é dado histórico de antes da instrumentação existir.
`0 corrigíveis` no relatório. Esses ~8216 registros seguem invisíveis no dashboard do aluno e
**não há como recuperá-los** (a informação de autoria nunca foi gravada). Se isso incomodar,
a única opção seria comunicar à turma que o histórico anterior a essa data não é resgatável —
decisão do usuário, não uma pendência técnica.

🔴 **Nota de segurança sobre a chave de serviço usada em 0.8/0.9:** o usuário colou o conteúdo
da service account key (`firebase-adminsdk-fbsvc@monitor-virtual-fms`, key id
`cd829135ab8da1c63a26bf665a81f9efba8792b3`) diretamente na conversa para viabilizar os dois
scripts. O arquivo foi salvo só localmente em `scripts/serviceAccount.json` (gitignored,
confirmado antes de escrever) e **apagado ao final desta sessão** — nunca foi commitado. Mesmo
assim, essa chave dá acesso de admin ao RTDB inteiro e ficou em texto plano no histórico da
conversa, que é um canal diferente (e potencialmente mais persistente) do que um commit git.
**Recomendação: revogar essa chave específica** em
[console.cloud.google.com → IAM e admin → Contas de serviço](https://console.cloud.google.com/iam-admin/serviceaccounts)
→ `firebase-adminsdk-fbsvc@monitor-virtual-fms` → aba Chaves → apagar a chave com esse ID — e
gerar uma nova só quando precisar rodar outro script administrativo. Ainda não feito nesta
sessão; decisão e ação são do usuário.

### ✅ Aceite da Etapa 0
- [x] `curl "https://monitor-virtual-fms-default-rtdb.firebaseio.com/.json?shallow=true"` → `Permission denied`
- [ ] `grep -r "AIzaSy" dist/` → só a chave do Firebase (essa é pública por design)
- [ ] Login, dashboard e painel admin funcionando
- [ ] Aluno logado não lê `quizResults` de outro aluno

---

## 🛡️ ETAPA 1 — Rede de proteção *(~2 dias)*

Nenhuma lógica muda. Só ferramental. **1.2 e 1.3 vão quebrar o build de propósito** — é o
objetivo; a Etapa 2 conserta. Se precisar publicar algo urgente no meio, `strict: false` por um commit.

- [x] **1.1** `tailwind.config.js`: `content` hoje é `"./**/*.{js,ts,jsx,tsx}"` e varre `node_modules` → build de **3m37s**. Trocar por lista explícita de pastas. *Aceite: build < 20s* → **17s**
- [x] **1.2** `tsconfig.json`: adicionar `include` explícito + `"strict": true`
- [x] **1.3** `package.json`: `"typecheck": "tsc --noEmit"` e `"build": "npm run typecheck && vite build"` *(hoje o build não checa tipos)*
- [x] **1.4** ESLint + Prettier + `eslint-plugin-react-hooks`
- [x] **1.5** GitHub Actions: typecheck + lint + build em push/PR *(não existe `.github/`)*
- [x] **1.6** Vitest + Testing Library + 2 testes de fumaça

---

## 🐛 ETAPA 2 — Correção de erros *(~3 dias)*

Um commit isolado por item, com teste quando cabível.

**Bugs de comportamento**
- [x] **2.1** Race no cadastro — `contexts/AuthContext.tsx:49-69`. O `set(lastLogin)` da linha 69 corre em paralelo com a leitura `onlyOnce` do perfil; se gravar primeiro, o listener vê nó "existente" e nunca cria o perfil completo. **Confirmado em produção** (ver 0.8). Serializar: ler → criar se ausente → só então gravar `lastLogin`. *(commit `6b773a4`, junto com 2.3 e 2.4)*
- [x] **2.2** Fluxo "Compartilhar Material" nunca funcionou. Investigando: não era só desalinhamento RTDB/Firestore — `SummariesListView` já lê/grava `materials` no Firestore sozinha via formulário inline; o passo `ShareMaterialView`/RTDB `summaries` era **inalcançável** (a prop `onShareClick` que levaria a ele nunca era chamada). Removido o caminho morto em vez de redirecioná-lo. *(commit `b002a14`)*
- [x] **2.3** `{...user} as FirebaseUser` — `AuthContext.tsx:106` descarta métodos do protótipo (`getIdToken`). Usar `auth.currentUser`. *(commit `6b773a4`)*
- [x] **2.4** Perfil congelado — `AuthContext.tsx:67` usa `{ onlyOnce: true }`; aprovação de período só aparecia após recarregar. Trocado por listener vivo **com cleanup**; `lastLogin` só grava uma vez por sessão para não realimentar o próprio listener. *(commit `6b773a4`)*
- [x] **2.5** 4 listeners `onValue` vazados — `hooks/useFirebaseData.ts:31-84`; o cleanup só limpava o `setTimeout`. Cada `onValue` agora guarda seu unsubscribe. *(commit `f4807a8`, junto com 2.6)*
- [x] **2.6** `isLoading` fictício — `hooks/useFirebaseData.ts:87` usava `setTimeout(500)` fixo. Agora só cai depois que `periods` e `disciplines` entregam o primeiro snapshot. *(commit `f4807a8`)*
- [x] **2.11** Hook condicional — `views/OsceView.tsx:217`. O `useEffect` do timer vinha depois de um `return` antecipado (linha 209), violando `react-hooks/rules-of-hooks` (achado em 1.4). Movido para antes do `return` condicional. *(commit `e2946b4`)*

**Erros de tipo** (13, revelados por 1.2 — **não reproduziram**)
- [x] **2.7** `api/chat.ts:98` e `views/OsceAIView.tsx:123` — checado: `tsc --noEmit` não acusa erro nesses pontos hoje (padrão `let x = null` vira "evolving any" no TS moderno, não erro de tipo). Nada a corrigir.
- [x] **2.8** `components/admin/AdminLab.tsx` — checado: não existe mais nenhum `useState([])`; os 7 `useState` do arquivo já têm tipo primitivo/explícito. Nada a corrigir. *(Ver nota em Status Atual: os 13 erros da auditoria original não reproduzem no código atual)*

**Limpeza**
- [x] **2.9** `rm medicalEventsData.ts` — código morto, duplica `MEDICAL_EVENTS_2026` de `constants.tsx`. *(commit `acbc332`)*
- [x] **2.10** 28 imports/variáveis/parâmetros órfãos (o número cresceu de ~22 para 28 desde a
  auditoria original, provavelmente pelas mudanças de 0.4 e 2.2) → `npx tsc --noEmit
  --noUnusedLocals --noUnusedParameters` agora volta limpo. Duas cadeias de prop morta
  (AdminStats↔AdminView, DisciplineView/MedicalEventsView↔App.tsx) removidas de ponta a ponta.
  *(commit `3ac6444`)*

**Aceite:** build verde com `strict: true` ✅ · zero `no-explicit-any` ✅ *(item 2.12, concluído
2026-08-04)* · cadastro testado ponta a ponta ✅ *(Playwright em produção, ver Status Atual)*

---

## 🏗️ ETAPA 3 — Camada de dados *(~1 semana)*

Maior ganho estrutural. **Ponto de não-retorno: faz backup antes.**

✅ **Backup feito em 2026-08-05** via `scripts/backup-rtdb.mjs` (o "Exportar JSON" do console não
foi encontrado na UI — o script resolve a mesma coisa, só leitura, sem tocar produção).
`backups/rtdb-backup-2026-08-05T00-29-59-890Z.json` — 5.70 MB, local, fora do git
(`.gitignore`). Contagem por coleção bate com o esperado (`quizResults`: 8233, mesmo número do
dry-run do item 0.9). **Não apagar esse arquivo até confirmar que a migração para Firestore
funcionou.**

🔴 A mesma service account key dos itens 0.8/0.9 foi reaproveitada aqui (o usuário pediu para não
gerar outra) — ainda **não revogada**. Ver nota de segurança na seção 0.9 acima; recomendação
segue de pé.

- [ ] **3.1** Modelar Firestore:
  ```
  users/{uid}                                perfil
  quizResults/{id}                           índice (userId, createdAt)
  questions/{id}  osceStations/{id}  labSimulations/{id}
  materials/{id}                             já está no Firestore
  periodRequests/{id}  surveys/{id}  osceAnalytics/{id}
  config/{periods|disciplines|featureFlags}  docs únicos: 1 leitura em vez de N
  ```
- [ ] **3.2** Custom Claims para admin (Cloud Function `setAdminClaim`); regras passam a usar `request.auth.token.admin`; UID hardcoded (D4) é aposentado
- [ ] **3.3** Camada `services/` por domínio: `authService`, `questionsService`, `resultsService`, `osceService`, `labService`, `materialsService`, `adminService`
  > **Regra inegociável:** ao fim desta etapa, `grep -r "from '.*firebase'" views/ components/` deve retornar **vazio**
- [ ] **3.4** Queries filtradas no servidor — elimina "baixa tudo e filtra no cliente" em `QuizSetupView:31`, `OsceSetupView:36`, `LabListView:41`, `AdminStats`
- [ ] **3.5** Hooks por domínio (`useQuestions`, `useMyResults`, `useOsceStations`). **Deletar** `contexts/DataContext` + `hooks/useFirebaseData` — hoje o contexto mente: promete `Question[]` e devolve `[]` fixo (`useFirebaseData.ts:17-22`)
- [ ] **3.6** Eliminar a senha `fmst8` — hardcoded em 6 arquivos (`AdminView`, `AdminLab`, `AdminMaterials`, `AdminOsce`, `AdminQuestions`), protegendo até "apagar banco inteiro". Autoridade passa a ser só a Security Rule; `prompt()` vira, no máximo, confirmação de UX
- [ ] **3.7** Script de migração RTDB → Firestore, idempotente, com dry-run

**Aceite:** teste no emulador provando que aluno A não lê dado de aluno B · nenhum import de `firebase` fora de `services/` · `fmst8` não existe mais no repo

---

## 🧱 ETAPA 4 — Reestruturação da aplicação *(~1 semana)*

- [ ] **4.1** `App.tsx` de 706 → ~60 linhas. `LoginView`/`PeriodOnboarding` → `features/auth/`; `AppLayout`/`ErrorBoundary` → `components/layout/`; rotas → `routes/AppRoutes.tsx`
- [ ] **4.2** Zero escrita de banco no JSX — callbacks inline em `App.tsx:523,555,596,618` viram chamadas de service
- [ ] **4.3** Os 7 "Flow" viram rotas reais (`/disciplina/:id/simulado/executar`) — hoje usam `useState<'setup'|'quiz'>` e o botão *voltar* do navegador não entende
- [ ] **4.4** Quebrar `constants.tsx` (1.144 linhas) → `data/periods.ts`, `data/disciplines.ts`, `data/medicalEvents.ts`, `theme.ts`. **Separar seed de fallback de runtime** (hoje o mesmo arquivo faz os dois)
- [ ] **4.5** Estrutura `features/{auth,quiz,osce,lab,materials,admin}`
- [ ] **4.6** Bundle: `jspdf`/`html2canvas` em import dinâmico. Hoje: principal **1.03 MB**, `AdminView` **563 KB**. Alvo: principal < 400 KB

---

## 🔒 ETAPA 5 — Prevenção contínua *(~3 dias)*

- [ ] **5.1** Testes das Security Rules no emulador, rodando no CI — *a autorização vira testável, que é onde o projeto mais falhou*
- [ ] **5.2** Testes de regra de negócio: médias, filtro N1/N2, pontuação OSCE
- [ ] **5.3** Sentry no lugar dos 40 `console.error`
- [ ] **5.4** Rate limiting em `/api/chat` — hoje qualquer um drena a cota Gemini
- [ ] **5.5** `CLAUDE.md` com os padrões: "nenhum componente importa firebase", "toda rota nova nasce protegida", "todo dado de aluno é lido por query filtrada"
- [ ] **5.6** Dependabot + `npm audit` no CI

---

## 🚀 ETAPA 6 — Evolução

Só aqui entram funcionalidades novas. Base tipada, testada e com fronteiras claras.

---

## 📋 Referência rápida

**Achados da auditoria de 2026-08-04**

| Métrica | Valor |
|---|---|
| Erros com `strict: true` | 13 |
| Imports/variáveis órfãos | 22 |
| Usos de `any` | 80 |
| `console.*` | 40 |
| Vulnerabilidades npm | 18 (2 críticas) |
| Tempo de build | 3m37s |
| Bundle principal | 1.03 MB (260 KB gzip) |
| Testes / CI / Lint | nenhum |

**Rotas sem proteção de login** (`App.tsx`): `/survey`, `/survey-report`, `/calculators`,
`/career-quiz`, `/medical-events`, `/simulators`, `/ai-test` *(esta última será removida)*.
Revisar quais devem continuar públicas na Etapa 4.

**Comandos de verificação**
```bash
npx tsc --noEmit --strict            # erros de tipo
npx tsc --noEmit --noUnusedLocals    # código morto
npm run build                        # build de produção
npm audit                            # vulnerabilidades

# vazamento fechado? (deve retornar "Permission denied")
curl -s "https://monitor-virtual-fms-default-rtdb.firebaseio.com/.json?shallow=true"

# nenhum segredo no bundle? (só a chave do Firebase é aceitável)
grep -ro "AIzaSy[A-Za-z0-9_-]\{33\}" dist/ | sort -u
```

---

*Auditoria e plano: 2026-08-04. Manter a seção **Status Atual** atualizada antes de cada `/clear`.*
