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

**➡️ HANDOFF (2026-08-07, fim de sessão): Etapas 0-5 concluídas, Etapa 4 100% completa, Etapa 6
iniciada (item 6.1 concluído, com 4 rodadas de refinamento).** Nenhuma pendência de segurança
conhecida em aberto. Mudanças do 4º refinamento (abaixo) ainda **não commitadas** — aguardando
"sim" do usuário.

**Resumo do que fechou nesta sessão** (detalhe completo em cada seção):
- **Etapa 4, item 4.3**: Simulado/OSCE/Laboratório viraram rotas reais (botão voltar do
  navegador funciona, F5 não perde mais a estação/simulação escolhida). Ver seção Etapa 4.
- **Decisão D9** (durante o 4.3): só **Simulado Teórico** conta resultado/nota por enquanto —
  Lab/OSCE (todos os modos) pararam de salvar, reversível numa constante só
  (`utils/resultsPolicy.ts`). Ver seção Etapa 4.
- **Bug corrigido**: questões migradas na Etapa 3 tinham `id` ausente (a migração usa o `id`
  original como ID do documento e remove o campo de dentro dos dados, de propósito) — quebrava
  a gravação parcial por questão e explicava um achado antigo nunca resolvido da Etapa 4. Fix
  em 3 services (`id: data.id ?? d.id` na leitura), sem precisar de backfill. Ver seção Etapa 4.
- **Etapa 6, item 6.1** (primeira funcionalidade nova do projeto): **Área + Subárea de
  Conhecimento** — dois eixos transversais independentes (ex. "Anatomia" + "Sistema Reprodutor
  Feminino"), cruzando disciplinas, **ambos opcionais**. `/simulators` virou navegação em 2
  níveis (tipo de simulador → tema). Passou por **4 rodadas** de refinamento na mesma sessão
  depois do usuário ver cada versão rodando: (1) 1 eixo obrigatório → 2 eixos opcionais; (2)
  `/simulators` virou direto o seletor de Área → corrigido pra escolher o tipo primeiro; (3)
  Simulado Teórico **saiu temporariamente da lista** de `/simulators` (fica só dentro de
  disciplina por enquanto — decisão do usuário, código intacto), 4 simuladores futuros reais
  (Prescrição/Exames/Propedêutica/Evolução) voltaram como "Em breve"; (4) — depois de ver
  produção no ar — os cards "disponíveis" de Lab/OSCE, que só levavam pra `/` (sem valor real),
  ganharam uma tela intermediária de verdade (`/simulators/:typeSlug`): escolher o tipo →
  escolher a disciplina que tem esse conteúdo → cair direto na lista já filtrada
  (`/disciplina/:id/lab?cat=X` ou `/osce/configurar/:mode`, rotas do item 4.3, reaproveitadas
  sem alteração). Laboratório virou 4 cards por categoria (Anatomia/Histologia/Farmacologia/
  Exames) em vez de 1 genérico. Único doc-par de `config/*` com leitura pública no Firestore
  (decisão consciente, D6-style, mantida do 2º refinamento). Ver seção Etapa 6 para o detalhe
  completo de cada rodada.

**➡️ Próxima ação:** pedir "sim" do usuário para commit + push do 4º refinamento (mudanças em
`routes/AppRoutes.tsx`, `views/SimulatorsView.tsx` e os 2 arquivos novos em
`features/simulators/`). Depois, conversar sobre o que entra a seguir na Etapa 6 — o usuário
sinalizou que quer trabalhar os 4 simuladores futuros (Prescrição/Exames/Propedêutica/Evolução)
"detalhadamente depois", um de cada vez, mas não definiu qual primeiro. Quando o Simulado
Teórico voltar a ficar visível em `/simulators`, ainda fica pendente o teste ao vivo com a conta
admin real (criar Área(s)/Subárea(s), marcar questões de disciplinas diferentes, confirmar que
o filtro cruza disciplinas de verdade e salva certo no dashboard).

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
| D9 | Só **Simulado Teórico** conta resultado/nota "por enquanto" (`utils/resultsPolicy.ts`) | Decisão do usuário em 2026-08-06/07: Lab, OSCE (estático/RPG/IA) ficam de fora até a confiabilidade desses modos ser revisada — reversível numa constante só |

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

- [x] **3.1** Modelar Firestore *(feito em 2026-08-05 — `firestore.rules` + `firestore.rules.README.md`)*:
  ```
  users/{uid}                                perfil
  quizResults/{id}                           filtrado por where(userId==uid)
  questions/{id}  osceStations/{id}  labSimulations/{id}
  materials/{id}                             já estava no Firestore
  periodRequests/{id}  surveys/{id}  osceAnalytics/{id}
  config/{periods|disciplines|featureFlags}  docs únicos: 1 leitura em vez de N
  ```
  `discipline_config` (cascata do RTDB) foi eliminado — os overrides (themes/references/
  status/lockedFeatures) agora vivem direto dentro de cada disciplina em `config/disciplines`.
- [x] **3.2** Custom Claims para admin *(decisão registrada: **script local**
  `scripts/set-admin-claim.mjs`, não Cloud Function — projeto não tinha Firebase CLI/plano
  Blaze configurado e só existe 1 admin; ver pergunta respondida pelo usuário em 2026-08-05)*.
  `firestore.rules` já usa `request.auth.token.admin`; UID hardcoded (D4) fica só nas regras
  do RTDB antigo (aposentadas quando o RTDB for desligado).
- [x] **3.3** Camada `services/` por domínio: `authService`, `configService`, `questionsService`,
  `osceService`, `labService`, `materialsService`, `resultsService`, `surveyService`,
  `adminService`, `storageService`.
  > **Regra inegociável cumprida:** `grep -r "from '.*firebase'" views/ components/` retorna vazio.
- [x] **3.4** Queries filtradas no servidor — `quizResults` via `where('userId','==',uid)`,
  `materials` via `where('disciplineId'..).where('unit'..)`, `periodRequests` só admin lê.
- [x] **3.5** Hooks por domínio: `hooks/useAppConfig.ts` substituiu `hooks/useFirebaseData.ts`
  (deletado) — `contexts/DataContext` continua existindo (é dado estrutural cross-cutting, não
  um domínio isolado) mas agora só promete o que de fato entrega (`periods`, `disciplines`,
  `featureFlags`, `isLoading`, `isOnline` — os campos mortos `questions`/`quizResults`/etc. que
  sempre devolviam `[]` foram removidos do contrato). Domínios de dados (perguntas, resultados,
  OSCE, lab, materiais) são buscados direto pelos services nas views que precisam, sob demanda.
- [x] **3.6** Senha `fmst8` removida dos 5 arquivos que a usavam (`AdminView`, `AdminLab`,
  `AdminMaterials`, `AdminOsce`, `AdminQuestions`). Autoridade real: Security Rule com Custom
  Claim; os `prompt()` de senha viraram `confirm()`/double-check de UX.
- [x] **3.7** `scripts/migrate-rtdb-to-firestore.mjs` — idempotente (reaproveita os IDs do
  RTDB como ID do doc no Firestore), dry-run por padrão. **Escrito mas NÃO executado** —
  decisão do usuário em 2026-08-05: avançar por todo o código da Etapa 3 nesta sessão, mas
  só rodar a migração contra produção depois de revisão.

✅ **Verificado nesta sessão:** `npx tsc --noEmit` limpo · `npm run build` ok · `npx vitest run`
4/4 · lint sem regressão (26→22 problemas, todos pré-existentes, nenhum novo) · smoke test
Playwright como visitante deslogado contra `localhost:3000` — tela de login renderiza sem
travar, zero erros de console (mesma classe de incidente do `isLoading` na Etapa 2, não
reproduziu aqui).

✅ **Item "teste no emulador" do Aceite, fechado nesta madrugada:** `firebase.json` +
`.firebaserc` (project id `demo-luna-medclass`, 100% offline, sem tocar produção) +
`scripts/test-firestore-rules.mjs` — 15 cenários rodados de verdade contra o Firestore
Emulator local (Java 21 + `firebase-tools` via `npx`, nada instalado permanentemente):
isolamento aluno A / aluno B em `quizResults` e `users`, `config/*` só-admin-escreve,
`materials` (create aluno / update+delete só admin — o fix de segurança desta sessão),
custom claim `admin` funcionando. **15/15 passaram.** Isso valida a LÓGICA das regras
independente do que está publicado hoje em produção — reduz bastante o risco do passo 1
abaixo, mas não substitui: o emulador roda as regras do arquivo local, não sabe o que está
no console agora. Rodar de novo: `npx firebase-tools emulators:exec --only firestore "node
scripts/test-firestore-rules.mjs"` (baixa e roda o emulador sozinho, não precisa de nada
rodando em background depois).

🔴 **Pendências antes deste código valer em produção (ação do usuário):**
1. Publicar `firestore.rules` no Firebase Console → Firestore Database → Regras (as regras
   atuais do Firestore em produção nunca foram versionadas — eram o que estivesse configurado
   manualmente no console; não se sabe se eram restritivas ou abertas).
2. Rodar `node scripts/set-admin-claim.mjs --apply` (precisa da `scripts/serviceAccount.json`
   — apagada ao fim da sessão anterior, precisa gerar de novo ou reaproveitar se ainda existir).
3. Decidir quando rodar `node scripts/migrate-rtdb-to-firestore.mjs --apply` contra produção
   (depois de testar o app localmente contra o Firestore com as regras novas publicadas).
4. Só depois de 1–3 confirmados, testar de ponta a ponta em produção (cadastro, login, quiz,
   painel admin) antes de considerar o RTDB aposentável (D3).

**Aceite:** nenhum import de `firebase` fora de `services/` ✅ · `fmst8` não existe mais no
repo ✅ · teste provando que aluno A não lê dado de aluno B ✅ (validado no emulador, 15/15 —
falta só publicar em produção, item 1 acima).

---

## 🧱 ETAPA 4 — Reestruturação da aplicação *(~1 semana)*

**✅ Etapa 4 — CONCLUÍDA por completo em 2026-08-06/07** (4.1/4.2/4.4/4.5 feitos em 2026-08-05;
4.3 — adiado naquela sessão por depender de persistência que ainda não existia — fechado numa
sessão dedicada em 2026-08-06/07, ver detalhamento no item).

- [x] **4.1** `App.tsx` de 694 → 16 linhas *(feito em 2026-08-05)*. `components/layout/ErrorBoundary.tsx`
  + `AppLayout.tsx`; `features/auth/ProtectedRoute.tsx` (orquestrador) + `LoginView.tsx` +
  `PeriodOnboardingView.tsx`; `routes/AppRoutes.tsx` (lazy imports, os 7 "Flow", `Router`).
  Extração mecânica, zero mudança de comportamento — verificado com typecheck/lint/build/vitest
  e smoke test Playwright em 5 rotas públicas.
- [x] **4.2** Zero escrita de banco no JSX — **já resolvido pela Etapa 3**: os callbacks inline
  em `QuizFlow`/`OsceFlow`/`LabFlow` (hoje em `routes/AppRoutes.tsx`) chamam
  `saveQuizResult`/`saveOsceAnalytics`/`submitSurvey` dos services, não mais `push(ref(db,...))`
  direto. Ainda são lambdas inline nas rotas (não viraram funções nomeadas em arquivo
  separado) — se isso incomodar no futuro é polimento, não dívida de arquitetura.
- [x] **4.3** Os "Flow" de Simulado/OSCE/Laboratório viram rotas reais *(concluído em
  2026-08-06/07, sessão dedicada, como planejado no adiamento original)*.

  **Rotas novas** em `routes/AppRoutes.tsx`:
  ```
  /disciplina/:id/simulado/executar
  /disciplina/:id/osce/configurar/:mode      (mode = static|ai|rpg, path param)
  /disciplina/:id/osce/estacao/:stationId
  /disciplina/:id/lab/simulacao/:simId
  ```
  Quiz não precisou de persistência nova — `QuizSetupView` já grava as questões escolhidas no
  `localStorage` antes de `onStart`; a rota de execução só lê essa chave de volta. OSCE/Lab
  precisaram de fetch por ID, que não existia: `fetchOsceStationById`
  (`services/osceService.ts`) e `fetchLabSimulationById` (`services/labService.ts`), padrão
  `getDoc(doc(...))` igual já usado em `authService`/`configService`. `firestore.rules` não
  precisou mudar (a regra de leitura já cobria `getDoc` igual cobria `getDocs`). `onBack` das
  rotas novas usa `navigate(-1)` — histórico de navegador de verdade agora, em vez de
  `setStep(...)` manual.

  **Verificado com Playwright ad-hoc** (contra `npm run dev` local, 2 contas de teste
  descartáveis `qa.claude.etapa43*@example.com`, senha `ClaudeTest#2026!` — mesmo padrão de
  sessões anteriores, apagar em Firebase Console quando for limpar):
  - **Quiz** (`hm1`/periodo1): navega pra `/executar` ✅ · F5 no meio permanece ✅ · botão
    voltar cai no setup, avançar volta pro executar ✅ · acesso direto a `/executar` sem
    localStorage cai no setup ✅.
  - **OSCE estático** (`hm1`/periodo1, único modo com estação seedada em N1): setup → estação
    (`/osce/estacao/<firebaseId>`) ✅ · F5 permanece na mesma estação ✅ · cadeia de voltar
    (estação → configurar → mode-selection) ✅ · ID de estação inexistente e modo inválido na
    URL caem no fallback sem crash ✅. **13/13 verificações automatizadas passaram.**
  - **OSCE RPG/IA** (`hm2`/periodo2): a navegação pras rotas `/osce/configurar/rpg` e
    `/osce/configurar/ai` funciona (confirmado), mas **não havia nenhuma estação RPG/IA
    cadastrada** em N1 nem N2 no banco atual pra testar a execução de ponta a ponta — limitação
    de dado de teste, não algo que dava pra contornar sem popular o banco. O código de
    despacho (`station.mode === 'rpg' → DynamicOsceView`, `'ai' → OsceAIView`) é estruturalmente
    idêntico ao caminho estático já validado.
  - **Laboratório**: nenhuma das disciplinas UC do período1 testadas (`uci`, `ucii`, `iesc1`,
    `uccg1`) tinha simulação cadastrada pra testar a execução real — mesma limitação de dado. O
    fallback de ID inválido (`/lab/simulacao/<inexistente>` → volta pra lista) foi confirmado
    funcionando; o componente de execução (`LabExecFlow`) usa o mesmo padrão comprovado do
    `OsceExecFlow`.
  - `npx tsc --noEmit`, `npm run lint` (22 pré-existentes, nenhum novo), `npx vitest run`
    (44/44), `npm run build` — todos verdes antes e depois do teste manual.

  ✅ **Achado durante o teste manual, corrigido na mesma sessão (ver handoff no topo do
  documento para os detalhes técnicos completos):** parte das questões do Simulado Teórico
  migradas ao Firestore tinham `id: undefined` (só `firebaseId`), quebrando a gravação parcial
  por questão e provavelmente explicando o achado não resolvido da Etapa 4 sobre a "2ª questão
  aparecendo já respondida". Causa raiz: `scripts/migrate-rtdb-to-firestore.mjs` usa o `id`
  original como ID do documento e remove o campo de dentro dos dados de propósito. Corrigido em
  `services/questionsService.ts`/`osceService.ts`/`labService.ts` (`id: data.id ?? d.id` na
  leitura) — não é regressão desta mudança de rotas, é pré-existente desde a migração da Etapa 3.

  🟢 **Decisão nova, tomada com o usuário durante este item (ver D9):** por enquanto, só o
  Simulado Teórico conta resultado/nota — Laboratório, OSCE Estático, OSCE RPG e OSCE IA
  pararam de salvar (`utils/resultsPolicy.ts`). Motivada por uma pergunta lateral (o modo IA
  nunca salvou nada, achado ao ler `OsceAIView.tsx`) que o usuário decidiu expandir depois de
  ver o inventário completo do que cada modo salva hoje. `AdminStats` ("Estatísticas") e
  `AdminAnalytics` ("Research Analytics") pararam de exibir esses tipos — dado antigo
  permanece no Firestore, só ficou escondido nas duas telas.
- [x] **4.4** Quebrar `constants.tsx` (1.145 linhas) → `data/periods.ts`, `data/disciplines.ts`,
  `data/questions.ts` (`INITIAL_QUESTIONS`), `data/medicalEvents.ts`, `theme.ts` *(feito em
  2026-08-05)*. `THEME` nunca foi importado em lugar nenhum antes — preservado no novo
  arquivo, não é escopo desta etapa decidir se deveria existir. Efeito colateral bom: os dados
  de congressos médicos (`MEDICAL_EVENTS_2026`) saíram do bundle principal, já que agora só o
  `MedicalEventsView` (lazy) importa `data/medicalEvents.ts`.
- [x] **4.5** Estrutura `features/{auth,quiz,osce,lab,materials,admin}` *(feito em 2026-08-05)*.
  `git mv` preservando histórico: `views/{QuizSetupView,QuizView}` → `features/quiz/`;
  `views/{OsceView,DynamicOsceView,OsceSetupView,OsceAIView,OsceModeSelectionView}` →
  `features/osce/`; `views/{LabListView,LabQuizView}` → `features/lab/`;
  `views/SummariesListView` → `features/materials/`; `views/AdminView` +
  `components/admin/*` → `features/admin/` (`AdminView.tsx` + `components/`). Views que não se
  encaixam nos 6 domínios (Period/Home/Discipline/Calculators/CareerQuiz/References/
  Simulators/Survey*/MedicalEvents/StudentDashboard) continuam em `views/` — não fazia sentido
  criar uma feature só pra elas. Só ajuste de profundidade de import relativo, zero mudança de
  comportamento; typecheck/lint/build/vitest limpos + smoke test local.
- [x] **4.6** Bundle: investigado em 2026-08-05. **`jspdf`/`jspdf-autotable` já só são importados
  em `AdminStats.tsx`**, que só carrega dentro do chunk lazy de `/admin` — nunca estiveram no
  bundle principal. `html2canvas` nem é importado diretamente no código (dependência
  transitiva do jsPDF, já isolada em chunk próprio pelo Vite). O alvo "principal < 400 KB" do
  audit original parece ter sido um diagnóstico equivocado: hoje o bundle principal (~844 KB,
  219 KB gzip) é dominado por React+ReactDOM+react-router-dom+Firebase (Auth+Firestore+Storage)
  — código que toda página precisa, carregado antes do login. Reduzir mais exigiria lazy-init
  do Firebase Storage (só carregar quando materiais/lab realmente usam upload) — mudança de
  risco médio que toca vários services; não tentada sem poder testar upload de arquivo contra
  produção. Registrado como próximo passo real, não "dynamic import de jspdf" (que já era
  verdade).

### 🧪 Teste de ponta a ponta contra produção (2026-08-05, com conta descartável)

Depois de mover os arquivos (4.5), testei o fluxo real logado contra
`lunamedclass.vercel.app` via Playwright — cadastro real, navegação por período/disciplina,
carregamento do banco de questões, início de simulado. **Confirma que o pipeline inteiro da
Etapa 3 funciona**: cadastro cria perfil no Firestore, `config/periods`/`config/disciplines`
carregam certo, `questions` (860 migradas) aparecem corretas na tela (ex: HM1/N1 mostrou 5
bancos oficiais de 40 questões cada). Zero erros de console em todas as telas visitadas.

🟡 **Achado ao tentar responder a 2ª questão de um simulado:** depois de confirmar a resposta
da questão 1 e clicar "PRÓXIMA", a questão 2 apareceu já em estado de feedback/resposta
revelada (com as opções desabilitadas), sem eu ter clicado em nada — mas o contador
"Progresso 0/3" e "3 pendentes" não bateu com isso. Não consegui concluir se é um bug real ou
um artefato da minha automação (o clique certo pode ter caído no elemento errado durante uma
transição). **Importante: não mexi em `InteractiveQuiz.tsx` nem na lógica de `QuizView.tsx`
nesta sessão** — só movi os arquivos de lugar (4.5) e ajustei imports; se for um bug de
verdade, é pré-existente, não uma regressão desta etapa. Vale o usuário testar manualmente
respondendo um simulado curto (2-3 questões) pra confirmar se reproduz.

✅ **Investigado em 2026-08-06 (leitura de código, sem precisar reproduzir):** em
`components/InteractiveQuiz.tsx`, o flag `isAnswered` de cada questão (`userAnswer =
answers[q.id]; isAnswered = userAnswer !== undefined`) e os contadores `answeredCount`/
`unansweredCount` usados na barra de progresso e no badge "pendentes" **vêm exatamente do
mesmo objeto de estado `answers`**, calculados no mesmo render. Não existe caminho no código
para eles divergirem (questão 2 aparecer respondida enquanto o contador mostra 0/3) dentro de
um único render — não achei bug estrutural. Explicação mais provável: a automação Playwright
capturou um frame no meio da transição `animate-in slide-in-from-right-4 duration-500` entre
questões, ou um clique duplo/mal direcionado durante a transição. **Não abri item de correção
sem uma reprodução real.** Se o usuário reproduzir manualmente respondendo um simulado curto,
vale reabrir como bug com passos claros.

🧹 **Limpeza pendente:** ficaram ~15 contas de teste descartáveis em
`Firebase Console → Authentication`, todas com prefixo **`qa.claude.etapa4`** no e-mail
(padrão `qa.claude.etapa4*@example.com`, senha `ClaudeTest#2026!` se precisar inspecionar
alguma antes de apagar). Não deu pra limpar via script porque `scripts/serviceAccount.json`
já tinha sido apagada (corretamente) antes desse teste. Basta buscar "qa.claude.etapa4" na
lista de usuários do Authentication e apagar em lote — cada uma tem um perfil correspondente
em `users/{uid}` no Firestore que fica órfão mas inofensivo (nenhuma delas concluiu um
simulado até salvar resultado, então não deixaram `quizResults`).

---

## 🔒 ETAPA 5 — Prevenção contínua *(~3 dias)*

**➡️ Itens 5.1, 5.2 e 5.3 concluídos e enviados a `origin/main` — próxima ação é o item 5.4**
(rate limiting em `/api/chat`). Ver detalhamento de cada item mais abaixo nesta seção.

✅ **Revogar a service account key antiga** (`firebase-adminsdk-fbsvc@monitor-virtual-fms`, key
id `cd829135ab8da1c63a26bf665a81f9efba8792b3`) — **feito pelo usuário, confirmado em
2026-08-06.** Era a pendência de segurança mais velha do projeto (aberta desde a Etapa 0,
04/08) — a credencial de admin que ficou exposta em texto plano no histórico da conversa
finalmente parou de ser válida. Nenhuma pendência de segurança conhecida em aberto no momento.

✅ **Apagar ~15 contas de teste** `qa.claude.etapa4*@example.com` — **feito pelo usuário
manualmente em 2026-08-06** (Firebase Console → Authentication). Tentativa de automação via
token OAuth do `firebase-tools` tinha sido bloqueada pelo sandbox do Claude Code em sessão
anterior — ver [[limite-automacao-credenciais-2026-08]] na memória.

- [x] **5.1** Testes das Security Rules no emulador, rodando no CI — *a autorização vira testável, que é onde o projeto mais falhou*. *(feito em 2026-08-06)* `scripts/test-firestore-rules.mjs` já existia da Etapa 3 (validado manualmente, 15/15); esta sessão só automatizou:
  novo script `npm run test:rules` (`firebase emulators:exec --only firestore "node
  scripts/test-firestore-rules.mjs"`), `@firebase/rules-unit-testing@^5.0.1` (peer dep exige
  `firebase@^12`, por isso não a `^4.x` sugerida no comentário original do script) e
  `firebase-tools@^14.0.0` como devDependencies (antes só rodava via `npx` ad hoc). CI
  (`.github/workflows/ci.yml`) ganhou `actions/setup-java@v4` (Temurin 21 — o emulador do
  Firestore roda na JVM), `actions/cache@v4` no `~/.cache/firebase/emulators` (evita rebaixar o
  `.jar` de ~40MB a cada run) e o passo `npm run test:rules` entre `test` e `build`. Rodado
  localmente antes de mexer no CI: **15/15 passaram**, typecheck/lint (22 problemas
  pré-existentes, nenhum novo)/vitest (4/4)/build todos verdes.
- [x] **5.2** Testes de regra de negócio: médias, filtro N1/N2, pontuação OSCE *(feito em
  2026-08-06)*. As fórmulas viviam como closures dentro de componentes (`views/CalculatorsView.tsx`,
  `features/osce/OsceView.tsx`, `features/quiz/QuizSetupView.tsx`), sem como testar
  isoladamente — extraídas para `utils/gradeCalculations.ts`, `utils/osceScoring.ts` e
  `utils/questionFilters.ts` (mesmo padrão de `utils/csvHelper.ts`), extração mecânica sem
  mudança de comportamento, componentes agora só chamam as funções puras. 36 testes novos
  (`*.test.ts` ao lado de cada módulo, convenção já usada no projeto): médias de UC/IESC/UCCG/
  HabMed com os pesos oficiais, pontuação OSCE (ordem certa/errada, penalidade por erro, piso
  em zero, gabarito vazio) e o filtro de unidade N1/N2 (questão legado sem `unit` conta como
  N1; disciplina UC ignora o filtro). Verificado: `tsc`/lint (22 problemas pré-existentes,
  nenhum novo)/vitest (36/36)/build limpos, e smoke test manual com Playwright contra
  `localhost:3000/calculators` confirmando que UC (4.34), HabMed (10.00) e IESC (10.00) batem
  exatamente com o valor calculado antes da extração — zero regressão visível.

  🟢 **Achado durante os testes, corrigido na mesma sessão (decisão do usuário):** IESC e UCCG
  usavam `parseFloat` puro nos campos de nota, sem suporte a vírgula decimal (`"8,5"` virava
  `8`) e sem fallback para campo vazio (um campo em branco fazia o cálculo inteiro virar `NaN`
  e a tela mostrar **"0.00"**, indistinguível de uma nota zero real, porque `NaN` é falsy em JS
  e o componente cai no fallback `result ? ... : "0.00"`). `calculateIescBase`/`calculateUccgBase`
  em `utils/gradeCalculations.ts` passaram a usar o mesmo `toNumberComma` que UC/HabMed já
  usavam. Confirmado com Playwright contra `/calculators`: 1 campo com vírgula (`"8,5"`) foi de
  8.00→9.78; 1 campo vazio foi de "0.00"(enganoso)→8.50(correto). Testes atualizados para
  refletir o comportamento corrigido. `tsc`/lint(22 pré-existentes)/vitest(36/36)/build verdes.
- [x] **5.3** Sentry no lugar dos 40 `console.error` *(feito em 2026-08-06, escopo frontend)*.
  `sentry.ts` (novo, raiz) chama `Sentry.init` só em build de produção
  (`import.meta.env.PROD`), com `captureConsoleIntegration({ levels: ['error'] })` — captura os
  17 arquivos que já chamam `console.error` automaticamente, sem precisar editar cada um.
  `components/layout/ErrorBoundary.tsx` ganhou `captureReactException(error, errorInfo)` no
  `componentDidCatch`, para os erros de renderização que não passam por `console.error`. DSN
  fica em `VITE_SENTRY_DSN` — não é segredo (mesma categoria de `VITE_FIREBASE_API_KEY`: só
  permite enviar eventos, não dá acesso de leitura), documentado em `.env.example`. Verificado
  de ponta a ponta: build de produção local (`vite preview`, único modo em que `initSentry`
  ativa) + Playwright disparando um `console.error` real → **200 OK** no envelope enviado a
  `ingest.us.sentry.io` — confirma que o evento chegou de verdade no projeto, não só que o
  código compila.

  🟡 **Escopo consciente: só frontend.** Cheguei a instalar `@sentry/node` para cobrir o único
  `console.error` de `api/chat.ts`, mas descartei — o SDK Node do Sentry v10 arrasta
  `@opentelemetry/core@1.30.1`, que tem uma vulnerabilidade moderada conhecida
  (GHSA-8988-4f7v-96qf), e isso viraria dependência de produção só para cobrir 1 call site. A
  Vercel já mantém logs de função separadamente; monitorar `api/chat.ts` via Sentry fica como
  possível item futuro, não decidido agora.

  🟡 **Custo aceito:** bundle principal cresceu de 844 KB → 935 KB (219→250 KB gzip) com o SDK.
  Seguindo a mesma leitura do item 4.6 (bundle dominado por React+Firebase, carregado antes do
  login de qualquer forma) — não bloqueia, mas é o tipo de coisa que soma se mais SDKs entrarem.

  ✅ **`VITE_SENTRY_DSN` adicionada nas Environment Variables da Vercel pelo usuário em
  2026-08-06** — confirmado pelo usuário. Como env var só é lida em build, o deploy **atual**
  em produção ainda não tem isso embutido — passa a valer automaticamente no próximo deploy
  (qualquer novo `git push` a `main` já dispara um; não precisa de ação manual extra na Vercel).
- [x] **5.4** Rate limiting em `/api/chat` *(feito em 2026-08-06)*. `api/_lib/rateLimit.ts`
  (prefixo `_` para a Vercel não tratar como rota) — limitador em memória por IP
  (`x-forwarded-for`), duas janelas: 10 requisições/60s e 60/hora. `api/chat.ts` chama
  `isRateLimited` antes de qualquer coisa (antes até de olhar o body) e devolve `429` com
  mensagem em português quando estoura. 8 testes novos (`api/_lib/rateLimit.test.ts`) cobrindo
  as duas janelas, expiração e isolamento entre IPs — 44/44 no total. `tsc`/lint (22
  pré-existentes, nenhum novo)/build verdes.

  🟡 **Limitação assumida conscientemente, documentada no próprio arquivo:** é um teto por
  instância serverless, não distribuído — zera em cold start e não protege contra abuso
  coordenado de muitos IPs diferentes. Sobe bastante a barra contra o caso real descrito no
  handoff anterior (alguém batendo o endpoint em loop), mas não é uma garantia dura. Uma
  garantia dura pediria Vercel KV/Upstash — recurso externo que precisaria ser provisionado
  manualmente no dashboard da Vercel (fora do escopo deste item, mesmo padrão de decisão do
  5.3 sobre não adicionar `@sentry/node`). Não testado contra produção/`vercel dev` porque o
  projeto não tem esse script e a lógica é pura — coberta pelos testes unitários.

  🔵 **Achado não corrigido, fora do escopo deste item:** `/api/chat` hoje não verifica
  autenticação nenhuma (nem o frontend envia token, nem o backend checa) — qualquer request
  HTTP direto (sem estar logado no app) já era aceito antes desta mudança e continua sendo,
  só que agora limitado. Rate limiting é mitigação de custo/abuso, não controle de acesso.
  Fechar isso de verdade exigiria validar Firebase ID token no servidor (SDK `firebase-admin`
  + credenciais de service account como env var na Vercel) — mudança maior que "rate
  limiting", registrar como item novo se o usuário quiser endurecer isso further.
- [x] **5.5** `CLAUDE.md` com os padrões *(feito em 2026-08-06)*. Cobre as 3 regras pedidas
  (nenhum componente importa firebase / toda rota nova nasce protegida / todo dado de aluno é
  lido por query filtrada) mais o porquê de cada uma (D4/D5/D6), 3 lições de incidente já
  vividas neste projeto (isLoading do visitante deslogado, `parseFloat` sem vírgula no IESC/
  UCCG, `/api/chat` sem auth), convenções de código e os comandos de verificação. Documenta um
  padrão real do código como exemplo da regra 2: `/survey-report` não tem `<ProtectedRoute>`
  na rota, mas a Security Rule de `surveys/{id}` exige Custom Claim `admin` para leitura — a
  autoridade é a regra, não a UI (checado nesta sessão, lendo `firestore.rules` e o componente:
  não há vazamento, é a aplicação prática do D5).
- [x] **5.6** Dependabot + `npm audit` no CI *(feito em 2026-08-06)*. `.github/dependabot.yml`
  monitora `npm` e `github-actions`, PRs semanais. CI ganhou um passo `npm audit
  --audit-level=high` logo após `npm ci`, com `continue-on-error: true` — **visibilidade, não
  bloqueio**. Decisão consciente: `npm audit` hoje aponta 8 vulnerabilidades (1 crítica, 3
  altas, 4 moderadas), mas **todas exigem `--force` com breaking change** para corrigir. A
  única com relevância real de produção é `react-router-dom` (alta, CSRF em "RSC Mode" — modo
  que este app não usa, é SPA client-side tradicional); as outras 7 vêm de `firebase-tools`
  (devDependency só do emulador, não roda em produção). Bloquear o CI nelas sem uma decisão
  deliberada sobre o bump do `react-router-dom` (já adiado desde a Etapa 0/1 por ser breaking
  change) deixaria o pipeline vermelho sem caminho de correção imediato — mesmo problema que
  faria o lint ficar vermelho antes da Etapa 2. Dependabot vira o mecanismo de prevenção de
  verdade (PR automático a cada vulnerabilidade nova); o `npm audit` no CI é só visibilidade no
  log. Se o usuário quiser fechar as 8 atuais, o bump do `react-router-dom` é candidato a item
  novo — não feito aqui, decisão dele.

**✅ Etapa 5 — CONCLUÍDA em 2026-08-06** (5.1 a 5.6, todos os itens).

---

## 🚀 ETAPA 6 — Evolução

Só aqui entram funcionalidades novas. Base tipada, testada e com fronteiras claras.

- [x] **6.1 — Área + Subárea de Conhecimento + revisão cross-disciplina no Simulado Teórico**
  *(concluído em 2026-08-07, com um refinamento na mesma sessão depois do usuário ver a
  primeira versão rodando)*. Eixo de classificação transversal, independente de disciplina/UC/
  período — hoje o portal só organizava conteúdo por disciplina (UC específica) e por `theme`
  granular preso a cada disciplina. Caso de uso: aluno no fim do curso revisando por assunto,
  cruzando todas as UCs onde aquele assunto apareceu, sem precisar lembrar em qual UC foi dado.

  **Nome deliberadamente diferente de "Tema/Eixo"** (aba já existente no admin, conceito
  diferente — o `theme` por disciplina) — chamados de **Área** e **Subárea de Conhecimento**
  pra não colidir.

  🔄 **Refinamento pós-implementação (mesma sessão):** a primeira versão tinha só 1 eixo
  (Área) e o campo era **obrigatório** no cadastro de questão. O usuário reconsiderou depois de
  ver rodando: (1) obrigatório trava o cadastro de conteúdo novo — melhor ir classificando aos
  poucos; (2) 1 eixo só não bastava pro exemplo real ("Anatomia" + "Sistema Reprodutor
  Feminino" são duas coisas diferentes — área ampla vs. assunto específico). Decisão fechada:
  **dois eixos independentes, ambos opcionais, sem cascata entre eles** (a mesma subárea pode
  combinar com várias áreas — ex. "Sistema Reprodutor Feminino" em Anatomia, Histologia,
  Fisiologia...). Servem pra todo tipo de disciplina do currículo (UC, Habilidades Médicas,
  IESC, UCCG), não só ciências biomédicas clássicas.

  **Modelo**: `AreaConhecimento`/`SubareaConhecimento { id, label }` em `types.ts`;
  `Question.areaConhecimentoId`/`subareaConhecimentoId` ambos opcionais, sem validação de
  obrigatoriedade no formulário. `config/areasConhecimento` + `config/subareasConhecimento` no
  Firestore, mesmo padrão de `config/periods`/`config/disciplines`
  (`services/configService.ts` — CRUD generalizado num helper genérico `createTagListEntry`/
  `renameTagListEntry`/`deleteTagListEntry` reaproveitado pelos dois eixos, em vez de duplicar
  a lógica; exposto via `useAppConfig`/`DataContext`).

  **Únicos 2 docs de `config/*` com leitura pública** (`firestore.rules`) — decisão consciente:
  as listas (só rótulos, sem dado sensível) precisam aparecer em `/simulators` pra visitante
  deslogado; as perguntas em si continuam exigindo login normalmente. 6 cenários em
  `scripts/test-firestore-rules.mjs` confirmando isso (anônimo lê áreas/subáreas, não escreve;
  admin escreve) sem abrir `config/periods`/`disciplines`/`featureFlags` (21/21 no total).

  **Admin**: componente `AdminTagList.tsx` genérico (título/descrição/CRUD via props) — usado
  duas vezes (`AdminView.tsx`) pras abas "Áreas de Conhecimento" e "Subáreas de Conhecimento",
  em vez de dois arquivos quase-idênticos. `AdminQuestions.tsx` ganhou os dois seletores
  (opcionais) nos dois formulários (import CSV e modal manual); editar uma questão permite
  também **limpar** uma classificação já existente (dropdown em branco), não só trocar.

  **`/simulators` deixou de ser mockup morto** — os 8 cards antigos apontavam pra rotas que não
  existiam no roteador (`/lab-anatomy`, `/prescription-simulation` etc., achado nesta sessão).

  🔄 **2º refinamento pós-implementação (mesma sessão):** a primeira versão fez `/simulators`
  virar diretamente a lista de Áreas — o usuário apontou que isso pulava um nível: a rotina
  pretendida é **clicar em "Simuladores" → escolher o TIPO de simulador (Lab, Paciente
  Virtual, RPG, Simulado Teórico...) → só depois escolher o tema**. Corrigido pra 2 níveis:
  - `views/SimulatorsView.tsx` — volta a ser a lista de **tipos** (Simulado Teórico,
    Laboratório Virtual, OSCE Estático, OSCE RPG, Paciente Virtual), baseada em funcionalidade
    real do app (não resgatei os cards 100% fantasiosos do mockup original, tipo
    "Propedêutica", que nunca corresponderam a nada implementado). Só **Simulado Teórico** é
    clicável — os outros aparecem com badge "Em breve" (`opacity-70 grayscale`, mesmo padrão
    visual já usado em `DisciplineView.tsx` pra feature bloqueada) até ganharem Área/Subárea
    também.
  - `features/simulators/TeoricoAreaListView.tsx` (novo) — o que antes vivia em
    `SimulatorsView.tsx`: lista as Áreas reais, com link "← Voltar aos Simuladores".
  - Rotas: `/simulators` (tipos, pública) → `/simulators/teorico` (áreas do Simulado Teórico,
    pública) → `/simulators/teorico/:areaId` (configurar, protegida) →
    `/simulators/teorico/:areaId/executar` (protegida). Escolher uma área ainda leva à
    configuração de quantidade/ordem cross-disciplina, sem filtro N1/N2, **com filtro opcional
    por Subárea** (só mostra as que de fato têm questão dentro da área escolhida) →
    reaproveitando **`QuizView` sem nenhuma modificação** (objeto `SimulationInfo` sintético).

  🔄 **3º refinamento pós-implementação (mesma sessão):** o usuário perguntou o que aconteceu
  com os simuladores que existiam no mockup original (8 cards) e deu 2 instruções novas:
  1. **Prescrição Farmacológica, Interpretação de Exames (como simulador próprio, não a
     categoria dentro do Lab), Propedêutica e Evolução Clínico-Hospitalar são planos reais**,
     não lixo do mockup — voltaram pra lista de `/simulators` como "Em breve" (mesmo badge).
  2. **Simulado Teórico saiu da lista de `/simulators`** — "por enquanto prefiro que deixe
     apenas dentro das disciplinas". Todo o código do fluxo por Área/Subárea continua intacto
     (`/simulators/teorico`, `AreaQuizSetupView.tsx`, admin) — só o card em `SimulatorsView.tsx`
     foi removido, nada foi revertido. Fácil religar depois (é 1 objeto na lista
     `SIMULATOR_TYPES`).
  3. **Princípio novo, aplicado já nesta sessão:** "ao adicionar um simulador dentro das
     disciplinas, ele já pode ficar disponível em /simulators" — Laboratório Virtual, OSCE
     Estático, OSCE RPG e Paciente Virtual (IA) já são features reais usadas hoje dentro do
     fluxo por disciplina, então viraram clicáveis em `/simulators` **mesmo sem navegação
     cross-disciplina própria ainda**: o clique leva pro início do fluxo normal (`/`, seleção de
     período), de onde o aluno já chega em cada um deles do jeito que já funciona hoje. Não é
     uma segunda vitrine por tema — é só destravar o acesso, honesto sobre pra onde leva.

  **Escopo desta rodada (decidido com o usuário):** só o Simulado Teórico teve o trabalho de
  Área/Subárea + fluxo cross-disciplina construído — e está temporariamente fora da lista
  pública por decisão do usuário, não por limitação técnica. Os 4 tipos com plano real
  (Prescrição/Exames/Propedêutica/Evolução) ainda não têm nenhuma implementação — "vamos
  trabalhar bem em cada um detalhadamente depois", segundo o usuário.

  🔄 **4º refinamento pós-implementação (mesma sessão, depois de ver produção no ar):** o
  usuário mostrou print de `lunamedclass.vercel.app/simulators` e apontou que o 3º refinamento
  tinha ficado sem sentido: clicar num tipo "disponível" (Laboratório Virtual etc.) só levava
  pra `/` (seleção de período) — não entregava nada além do que já existia. Fluxo desejado, no
  exemplo dele: *Laboratório Virtual → UCVI - Percepção, Consciência e Emoção → Anatomia →
  ORGANIZAÇÃO DO SISTEMA NERVOSO CENTRAL E MEDULA ESPINAL*, e pediu pra já separar o Laboratório
  por categoria (Anatomia/Histologia/Farmacologia/Exames), cada uma como card próprio. Decisão
  de escopo confirmada via pergunta: os 4 tipos de Lab **e** os 3 de OSCE (Estático/RPG/Paciente
  Virtual) nesta mesma rodada — 7 cards clicáveis no total.
  - `features/simulators/simulatorTypesConfig.tsx` (novo) — fonte única de
    título/descrição/ícone/destino dos 7 tipos reais (`AVAILABLE_SIMULATOR_TYPES`) e dos 4
    "Em breve" (`COMING_SOON_SIMULATOR_TYPES`), usada tanto por `SimulatorsView.tsx` quanto pela
    tela de seleção de disciplina. Nome cuidadosamente diferenciado: o card real vira
    "Laboratório de Exames" (categoria já existente, identificação de imagem) pra não colidir
    com o card futuro "Interpretação de Exames" (plano mais amplo, análise crítica).
  - `features/simulators/FilteredDisciplineListView.tsx` (novo) — presentacional: recebe a
    lista de disciplinas que de fato têm conteúdo daquele tipo (com contagem) e navega pro
    `buildPath` de cada uma ao clicar.
  - `routes/AppRoutes.tsx` — rota nova `/simulators/:typeSlug` (`TypeDisciplineListFlow`,
    dentro de `<ProtectedRoute>` — precisa ler `labSimulations`/`osceStations`, que não são
    públicas). Busca via `fetchLabSimulationsOnce()`/`fetchOsceStationsOnce()` (já existiam),
    filtra por `category`/`mode`, agrupa por `disciplineId`, cruza com `useData().disciplines`.
    Slug sem match cai em `<Navigate to="/simulators" replace />`.
  - `views/SimulatorsView.tsx` — os 7 cards disponíveis passam a vir de
    `AVAILABLE_SIMULATOR_TYPES`, linkando pra `/simulators/${slug}` (não mais `/`).
  - **Nenhuma mudança** em `LabListView.tsx`, `LabQuizView.tsx`, `OsceSetupView.tsx` ou
    `firestore.rules` — o destino final de cada card (`/disciplina/:id/lab?cat=X` e
    `/disciplina/:id/osce/configurar/:mode`) já existia e já funcionava desde o item 4.3; só
    faltava o nível intermediário "em qual disciplina esse tipo de conteúdo existe".

  🟡 **Lição de teste desta rodada:** o roteiro Playwright pareceu inicialmente flaky num dos
  checks (`/simulators/osce-estatico` às vezes "travava" numa tela de sincronização global) —
  investigado a fundo (inclusive comparando dev server vs. build de produção via `vite preview`,
  e isolando a sequência exata de navegação) até achar a causa real: o **seletor do script de
  teste** misturava CSS e `text=` numa única string separada por vírgula (sintaxe inválida do
  Playwright), o que fazia a espera falhar silenciosamente e o check rodar cedo demais. Corrigido
  com `.or()`; depois disso, 11/11 checks passaram de forma consistente, incluindo clique real
  até `/disciplina/hm1/osce/configurar/static`. Não era bug do `DataContext`/`AppLayout` (código
  não tocado nesta rodada).

  🟡 **Verificação parcial, limitação conhecida (herdada do 3º refinamento):** criar
  Área/Subárea e marcar questões ainda exige Custom Claim `admin`, que esta sessão não tem como
  conceder. Sem esse acesso, não dá pra popular Lab/OSCE com mais disciplinas de teste — a
  verificação desta rodada usou o dado real já existente no banco (1 disciplina com estação
  OSCE Estático, nenhuma com Lab de Anatomia ainda) e confirmou que o estado vazio
  ("Nenhuma disciplina com esse conteúdo cadastrado ainda.") também renderiza corretamente.

  `tsc`/lint (22 pré-existentes, nenhum novo)/vitest (44/44)/build verdes.

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
