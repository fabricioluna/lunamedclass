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
conhecida em aberto. Commit `512db2c` (4º refinamento), **enviado a `origin/main`**.

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

**➡️ Sessão de 2026-08-18: itens 6.2, 6.3, 6.4 e 6.5 planejados e aprovados pelo usuário** (ver
seção Etapa 6 e decisões D10/D11).

- **6.2 (brasão dos períodos)** — ✅ concluído (`9b4af0c`), **já aplicado em produção** pelo
  usuário via aba "Períodos" do admin.
- **6.3 (flashcards)** — ✅ concluído (`a1f512a`) e no ar, mas **parcialmente superado pelo 6.5**
  depois do teste em produção.
- **Correção de build (`deb2a85`)** — `tailwind.config.js` nunca escaneou `features/` nem
  `routes/`. Achado a partir do botão "Médio" que saía branco: `bg-amber-500` só existia em
  `features/lab/LabQuizView.tsx` e era descartado do CSS. ⚠️ **Vale varrer o app atrás de
  outras classes fantasma** — qualquer utilitário usado só dentro de `features/`/`routes/` e em
  nenhum arquivo escaneado esteve sumindo do build esse tempo todo.
- **6.5 (Lab vira Anki de verdade)** — ✅ concluído, aguardando teste do usuário em produção.
- **6.6 (retomar sessão de onde parou)** — ✅ concluído junto, mesmo dia.
- **6.7 (treino focado nas lâminas difíceis)** — ✅ concluído junto, mesmo dia.
- **6.11 (rules não publicadas + falha silenciosa)** — ✅ **resolvido em 2026-08-22**: o usuário publicou `firestore.rules` no console e confirmou que o progresso passou a persistir. O banner de erro visível fica como rede de proteção permanente.
- **6.12 (viés na ordem da fila)** — ✅ concluído em 2026-08-22, a partir da pergunta do usuário sobre o modo aleatório.
- **6.13 (trava de regressão do Tailwind)** — ✅ concluído em 2026-08-22.
- **6.4 (liberação via Security Rules)** — ⏹️ **encerrado sem executar**, decisão do usuário: a trava de interface basta por ora.

**➡️ Etapa 6 sem itens abertos em 2026-08-22.** Lab testado e aprovado pelo usuário em produção.
- **6.10 (fim do calendário: flashcards viram pilhas)** — ✅ concluído. Última peça baseada em tempo removida do modelo.
- **6.9 (sessão linear + memorizado = "Lembrei fácil")** — ✅ concluído, corrige o 6.5/6.7 depois do teste do usuário.
- **6.8 (liberação por unidade N1/N2 na aba "Acessos")** — ✅ concluído. O usuário apontou que a
  aba "Acessos" já resolvia quase tudo que o 6.4 planejava; só faltava a granularidade de
  unidade, que é o que este item entregou.
- **6.4 (liberação de conteúdo via Security Rules)** — ⏸️ **em grande parte superado pelo 6.8**.
  Só sobrou a parte de segurança (a trava atual é de UI, contornável via SDK). Reavaliar se
  vale o risco antes de executar.

Os 4 simuladores futuros (Prescrição/Exames/Propedêutica/Evolução) continuam na fila, sem
prioridade definida.

**Pendência antiga ainda aberta:** quando o Simulado Teórico voltar a ficar visível em
`/simulators`, falta o teste ao vivo com a conta admin real (criar Área(s)/Subárea(s), marcar
questões de disciplinas diferentes, confirmar que o filtro cruza disciplinas de verdade e salva
certo no dashboard).

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
| D9 | Só **Simulado Teórico** conta resultado/nota "por enquanto" (`utils/resultsPolicy.ts`) | Decisão do usuário em 2026-08-06/07: Lab, OSCE (estático/RPG/IA) ficam de fora até a confiabilidade desses modos ser revisada — reversível numa constante só. **⚠️ Revista em 2026-08-18 (item 6.5): `laboratorio` volta a contar**, mas com 1 resultado por *sessão* de flashcards (não por lâmina). OSCE continua fora |
| D11 | Flashcards gravam **1 resultado por sessão** com o detalhe por lâmina em `details[]`, nunca 1 documento por lâmina | Decisão do usuário em 2026-08-18, depois de perguntar explicitamente sobre sobrecarga. `subscribeToMyResults` lê todos os `quizResults` do aluno sem limite: 1 doc por lâmina daria ~4.000 leituras por abertura do dashboard num semestre (cota grátis: 50.000/dia), além de afogar a média com "simulados de 1 questão". A granularidade por lâmina não se perde — vive no `details[]` e no estado SRS |
| D10 | Liberação de conteúdo = **gate central em `config/contentRelease` + `isPublished` denormalizado** em cada doc (item 6.4) | Decisão do usuário em 2026-08-18. Gate puro consultado por `get()` nas rules seria mais elegante, mas quebraria as leituras cross-disciplina do Simulado Teórico por Área (6.1): "rules não são filtros" — a query inteira falha se um único doc do resultado estiver bloqueado. O campo denormalizado é analisável em query; o gate central mantém a liberação em 1 clique por disciplina/unidade |

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

- [x] **6.2 — Brasão/ícone dos períodos + edição segura de `config/periods`**
  *(código concluído em 2026-08-18; falta o usuário aplicar em produção pelo painel)*. O crest `TURMA VIII` (`public/turma8.jpg`) acompanha a turma:
  sai do 2º período e vai para o 3º. O 2º período volta ao padrão dos outros 10 períodos —
  emoji em `Period.icon`, renderizado pelo fallback já existente em
  `views/PeriodSelectionView.tsx` — trocando o 🎓 genérico por **⚖️** (equilíbrio = "Ciclo da
  Homeostase", nome do próprio período; nenhum outro período usa esse emoji).

  ⚠️ **Achado que define o item:** `data/periods.ts` é só **fallback**. Quem manda para aluno
  logado é `config/periods` no Firestore (`hooks/useAppConfig.ts` só usa o arquivo local quando
  a leitura vem vazia ou negada). Mudar o arquivo altera apenas o visitante deslogado. E o
  botão "Injetar Estrutura (Seed)" do admin **não serve** para isso: `seedBaseStructure()` faz
  `setDoc` cru em `config/periods` **e** `config/disciplines`, apagando temas, referências,
  `status` e `lockedFeatures` editados pelo admin. Por isso o item inclui um caminho de
  escrita pontual.

  - `services/configService.ts`: `updatePeriodField(periodId, field, value)`, mesmo molde do
    `updateDisciplineField` já existente (lê o array, altera só o item alvo, regrava).
  - `data/periods.ts`: `crest` migra de `periodo2` para `periodo3`; `periodo2.icon` vira ⚖️.
  - Admin: edição de ícone/brasão por período, para o usuário aplicar em produção sem seed
    destrutivo e sem depender de uma sessão do Claude no próximo período.

  **Testes:** unitário provando que `updatePeriodField` preserva os demais campos e os demais
  períodos (o risco real aqui é justamente sobrescrever config); visual em `/` deslogado
  (círculo grande + marca d'água a 3% em `PeriodSelectionView`); aplicação em produção pelo
  painel e reconferência logado; `typecheck`/`lint`/`test`/`build`.

  ✅ **Entregue (2026-08-18):**
  - `utils/configItems.ts` + `utils/configItems.test.ts` (9 casos): `setItemField` e
    `removeItemField`, puros. `removeItemField` existe porque o Firestore **rejeita
    `undefined`** numa escrita — tirar um brasão exige apagar a chave, não gravar undefined.
    `updateDisciplineField` passou a usar o mesmo util (o `map` inline estava duplicado).
  - `services/configService.ts`: `updatePeriodIcon` / `updatePeriodCrest(periodId, crest|null)`
    sobre um `updatePeriodField` interno, no mesmo molde do lado de disciplinas.
  - `data/periods.ts` (fallback do visitante deslogado): `crest: '/turma8.jpg'` migrou para
    `periodo3`; `periodo2.icon` virou ⚖️.
  - `features/admin/components/AdminPeriods.tsx` + aba "Períodos" no `AdminView`: preview do
    emoji/brasão, edição por período, salvar só o que mudou, botão de remover brasão.
  - Verificação: `typecheck` ✅, `vitest` 53/53 (44 antes + 9 novos) ✅, `lint` 22 problemas
    (os mesmos pré-existentes, nenhum nos arquivos tocados) ✅, `build` ✅, e conferência no
    bundle de produção: `periodo3` com `crest`, `periodo2` com `icon:"⚖️"` e sem `crest`.

  🟡 **Pendente com o usuário (não dá para fazer sem Custom Claim `admin`):** aplicar em
  produção pela aba "Períodos" — só isso muda o que o **aluno logado** vê, já que
  `config/periods` no Firestore tem precedência sobre `data/periods.ts`.

- [x] **6.3 — Flashcards com repetição espaçada (estilo Anki) no Laboratório Virtual**
  *(concluído em 2026-08-18 — ⚠️ **parcialmente superado pelo item 6.5 no mesmo dia**, depois
  do usuário testar em produção: o modelo entregue aqui só tinha os intervalos em dias, sem os
  degraus em minutos que fazem o "não lembrei" voltar rápido. Ler o 6.5 antes de mexer neste
  código)*. Hoje o Lab tem autoavaliação binária "Acertei/Errei"
  (`features/lab/LabQuizView.tsx`) que só alimenta estatística — não muda o que o aluno vê
  depois. Pedido do usuário: 3 botões (Difícil/Médio/Fácil) onde o difícil reaparece mais e o
  fácil menos, **independente por usuário**, e recomendação do que ele mais erra.

  **Motor (SM-2 simplificado)** em `utils/srs.ts` + `utils/srs.test.ts` — regra de negócio pura
  em `utils` com teste ao lado, como manda o CLAUDE.md:
  `SrsCardState { cardId, answerLabel, ease, intervalDays, repetitions, lapses, reviews,
  dueAt, lastRating, lastReviewedAt }`; `hard` → intervalo 0 (volta na mesma sessão) e
  `ease -= 0.2` com piso 1.3, `lapses++`; `medium` → `interval * ease`; `easy` →
  `interval * ease * 1.3` e `ease += 0.15`. `buildSessionQueue()` põe vencidos primeiro,
  depois inéditos, e reinsere o card "Difícil" ~4 posições à frente (é isso que dá a sensação
  de "aparece mais vezes"). `getWeakestCards()` rankeia por `lapses`/`ease` = a recomendação
  de estudo.

  **Persistência:** subcoleção `users/{uid}/flashcardProgress/{simulationId}`, 1 doc por
  simulação com mapa `cards: { [questionId]: SrsCardState }`. Doc único em vez de 1 doc por
  card porque uma lâmina de 150 imagens viraria 150 leituras por sessão (~30 KB no mapa, longe
  do limite de 1 MB). Sob `users/{uid}` porque o isolamento por aluno passa a vir da **rota do
  documento**, não de um `where` que uma tela nova pode esquecer (regra 3 por construção).
  ⚠️ Regras do Firestore **não são recursivas**: `match /users/{uid}` não cobre a subcoleção —
  precisa de `match /users/{uid}/flashcardProgress/{simId}` explícito. Service novo:
  `services/flashcardsService.ts`. `answerLabel` fica denormalizado no estado para o dashboard
  citar a lâmina sem baixar a simulação inteira.

  **UI:** modo "Flashcards (Revisão Espaçada)" **pré-selecionado** no setup do Lab, convivendo
  com Sequencial/Aleatório/Intervalo (decisão do usuário — o modo intervalo é uso real de
  véspera de prova). Cada botão mostra quando o card volta ("Difícil · agora", "Médio · 3 d",
  "Fácil · 8 d"). Badge "X para revisar" em `LabListView`; bloco "seus pontos fracos" no
  `StudentDashboardView`.
  ⚠️ Manter a gravação gota-a-gota em `quizResults` (hard → 0/1, medium|easy → 1/1), senão
  `AdminStats` para de enxergar o Lab.

  **Testes:** o grosso em `utils/srs.test.ts`, sem Firebase (piso do ease; 3× "fácil" leva o
  intervalo a semanas; "difícil" reinsere na sessão e derruba o intervalo; fila ordena vencidos
  antes de inéditos; ranking por lapses). `npm run test:rules` com 4 cenários de isolamento
  (aluno A lê/escreve o próprio ✅, lê/escreve o de B ❌, anônimo ❌). Manual com 2 contas
  provando estado independente; persistência ao sair e voltar da rota; `AdminStats` ainda
  contabilizando Lab.

  ✅ **Entregue (2026-08-18):**
  - `utils/srs.ts` + `utils/srs.test.ts` (27 casos): `createInitialCardState`,
    `getOrCreateCardState`, `reviewCard`, `formatDueLabel`, `buildSessionQueue`,
    `getSessionCounts`, `reinsertForRetry`, `getWeakestCards`. Exatamente o desenho planejado
    (piso de ease 1.3, "Difícil" reinsere ~4 posições à frente na mesma sessão via
    `reinsertForRetry`, "Fácil" acumula bônus de 1.3× sobre o ease).
  - `services/flashcardsService.ts`: `fetchFlashcardProgress`, `upsertFlashcardCardState`
    (escreve só `cards.<cardId>` via `setDoc(..., {merge:true})` — merge recursivo do
    Firestore, não regrava o mapa inteiro a cada card revisado, evita corrida entre abas) e
    `fetchAllFlashcardProgressDocs` (lista a subcoleção inteira do aluno numa leitura só, sem
    precisar saber os IDs das simulações de antemão — é o que alimenta o dashboard).
  - `firestore.rules`: `match /users/{uid}/flashcardProgress/{simulationId}` com
    `allow read, write: if isOwner(uid)`. 5 cenários novos em
    `scripts/test-firestore-rules.mjs` (26/26 no total, emulador local com Java):
    dono lê/escreve o próprio ✅, outro aluno lê/escreve o de outrem ❌, anônimo ❌.
  - `features/lab/LabQuizView.tsx`: modo "Flashcards (Revisão Espaçada)" pré-selecionado,
    convivendo com Sequencial/Aleatório/Intervalo (inalterados). Botões Difícil/Médio/Fácil
    mostram "volta em Xd" antes do clique (via `formatDueLabel`); tela de fim de sessão com
    revisados/difíceis; "Difícil" reinsere sem avançar o índice (efeito visual de "reaparecer
    na mesma sessão"). Extraídos `QuestionMedia`/`AnswerReveal` como subcomponentes locais,
    reaproveitados pelos dois modos de execução (flashcard e clássico) — a imagem/dicas eram
    ~80 linhas idênticas duplicadas entre os dois branches. Compatibilidade com o analytics
    existente preservada: `hard` → 0/1, `medium`/`easy` → 1/1, mesmo `onSaveResult` opcional
    de antes (hoje sempre `undefined` em produção por D9 — Lab não conta nota).
  - `features/lab/LabListView.tsx`: badge "N para revisar" por simulação, calculado só sobre a
    lista já filtrada em tela (não o laboratório inteiro).
  - `views/StudentDashboardView.tsx`: bloco "Seus Pontos Fracos no Laboratório Virtual" — top 5
    cards globais por `lapses`/`ease`, cada um linkando direto pra `/disciplina/:id/lab/
    simulacao/:simId` daquele lab. Enriquecimento (título/disciplina/unidade) via
    `fetchLabSimulationById`, só para os poucos labs de origem do top 5, não pra tudo.
  - `routes/AppRoutes.tsx`: `userId` (uid do `currentUser`) passado para `LabQuizView` e
    `LabListView` — ambas as rotas já vivem sob `<ProtectedRoute>`, então `currentUser` está
    sempre presente ali.
  - Verificação: `typecheck` ✅, `vitest` 80/80 ✅, `test:rules` 26/26 ✅ (emulador local),
    `lint` 22 problemas (os mesmos pré-existentes, nenhum novo) ✅, `build` ✅.

  🟡 **Escopo não coberto nesta rodada:** o link de "pontos fracos" no dashboard leva pro
  início da sessão daquele lab (flashcard pré-selecionado), não pra um baralho filtrado
  contendo só aquelas lâminas específicas — construir um "modo revisão de N cards
  específicos" ficaria para uma iteração futura, se o usuário sentir falta.

- [~] **6.4 — Liberação de conteúdo por disciplina × unidade × tipo (painel admin)** — ⏹️
  **ENCERRADO SEM EXECUTAR, por decisão do usuário em 2026-08-22:** *"já funciona bem, acho que
  por enquanto não precisa se esforçar tanto nessa proteção"*. A aba "Acessos" + o item 6.8
  cobrem a necessidade real (dosar conteúdo ao longo do semestre). A camada de Security Rules
  fica **conscientemente** de fora: a trava é de interface e um aluno com o SDK do Firebase
  ainda lê conteúdo de unidade bloqueada. **Não é autorização — é curadoria pedagógica.**
  Reabrir só se o conteúdo passar a ter valor que justifique proteção real (prova, gabarito
  antes da aplicação).

  *Descrição original do item, preservada caso seja reaberto:*
  *(planejado em 2026-08-18; ⚠️ **em grande parte SUPERADO pelo item 6.8**, ver adiante — a aba
  "Acessos" já fazia o essencial e ganhou granularidade de unidade. O que resta deste item é
  só a camada de Security Rules, que é problema de segurança, não de pedagogia. Reavaliar com
  o usuário antes de executar: pode não valer o risco de índice + backfill + rules.)*. Pedido do usuário: início de período, todo o conteúdo já
  carregado no banco **não** deve ficar disponível — ele quer ir liberando conforme o semestre
  anda, **em lote por disciplina/unidade, não item por item**, e valendo para **todos** os
  tipos de conteúdo (materiais, lab, questões, OSCE).

  ⚠️ **Por que não um gate central puro** (só `config/contentRelease` consultado por `get()`
  nas rules, que seria o mais elegante): quebraria as leituras cross-disciplina. Tanto
  `services/questionsService.ts` quanto `services/osceService.ts` têm ramo **sem filtro de
  disciplina**, e é exatamente ele que alimenta o Simulado Teórico por Área (item 6.1). Como
  "rules não são filtros", uma regra baseada em `resource.data.disciplineId` faz a query
  inteira falhar se **um único** documento do resultado estiver bloqueado.

  **Desenho aprovado pelo usuário (2026-08-18): gate central + campo denormalizado.**
  1. `config/contentRelease` = `{ gates: { "ucv|N1|materials": true, ... } }` — matriz
     disciplina × unidade × tipo. É a fonte da verdade e o que o admin opera.
  2. Cada doc de `materials`/`labSimulations`/`questions`/`osceStations` carrega
     `isPublished: boolean` **derivado** do gate; ligar um gate propaga em `writeBatch`
     (blocos de 500) para os docs daquela disciplina+unidade+tipo.
  3. Rules leem `resource.data.isPublished == true` — analisável em query, funciona igual em
     consulta por disciplina e em consulta cross-disciplina.
  4. Conteúdo novo herda o gate no momento da criação (o service consulta o gate antes de
     gravar); ação "ressincronizar gates" no admin cobre divergências.

  | # | O quê | Onde |
  |---|---|---|
  | 6.4.1 | `ContentKind`, `ContentGateKey`, `isPublished?` nos 4 tipos | `types.ts` |
  | 6.4.2 | `utils/contentRelease.ts` + teste: montar/parsear chave, normalizar unidade ausente (legado = N1), resolver "este doc está liberado?" | `utils/` |
  | 6.4.3 | `services/contentReleaseService.ts`: ler gates, ligar/desligar propagando em lote, ressincronizar | `services/` |
  | 6.4.4 | `where('isPublished','==',true)` nas queries de aluno dos 4 services + **`firestore.indexes.json` novo** (não existe hoje; `firebase.json` só declara `rules`) | `services/`, raiz |
  | 6.4.5 | Rules dos 4 matches + `config/contentRelease`; `create` de material por aluno forçado a `isPublished: false` | `firestore.rules` |
  | 6.4.6 | Backfill `isPublished: false` em tudo — script rodado **uma vez, pelo usuário** (exige Custom Claim admin) | `scripts/` |
  | 6.4.7 | Aba "Liberação de Conteúdo": matriz com switches + "liberar unidade inteira" | `features/admin/` |
  | 6.4.8 | Estado vazio honesto no aluno ("Conteúdo ainda não liberado pela monitoria") em vez de lista vazia sem explicação | Lab/Materiais/Quiz |

  **Testes:** `utils/contentRelease.test.ts` (unidade ausente cai em N1; gate desconhecido =
  **bloqueado**, nunca o contrário). `npm run test:rules`: aluno lê liberado ✅ / bloqueado ❌;
  aluno cria material com `isPublished: true` ❌ e com `false` ✅; aluno escreve em
  `config/contentRelease` ❌; admin lê e escreve tudo ✅. Emulador: ligar um gate propaga para
  todos os docs da disciplina+unidade numa escrita só, e material criado depois já nasce
  liberado. **Regressão do 6.1** (o teste que justifica o desenho): `/simulators/teorico/:areaId`
  com questões de 3 disciplinas, uma bloqueada — a sessão monta com as outras duas, não falha
  inteira.

  ⚠️ **Ordem de publicação obrigatória:** índices → backfill → rules → deploy do código. Fora
  dessa ordem a turma inteira fica sem conteúdo nenhum. É o único dos três itens que pode
  derrubar tela em produção — fazer por último, em horário de baixo uso, com rollback das rules
  à mão.

- [x] **6.5 — Laboratório Virtual vira Anki de verdade (retrabalho do 6.3)**
  *(concluído em 2026-08-18, depois do usuário testar o 6.3 em produção)*. O 6.3 entregou a
  **metade dos dias** do Anki (intervalos, ease, ranking de pontos fracos) mas **não a metade
  dos minutos** — que é justamente a que o aluno sente. Três queixas reais do usuário, todas
  confirmadas no código:

  1. **"O desempenho nos flashcards não está sendo contabilizado no Meu Desempenho."**
     Causa: **D9**, não bug. `routes/AppRoutes.tsx` passa
     `onSaveResult={isCountedResultType('laboratorio') ? ... : undefined}` e
     `COUNTED_RESULT_TYPES = ['teorico']` — ou seja, `onSaveResult` chega `undefined` e o
     `if (onSaveResult)` do `handleRateFlashcard` nunca dispara. Estava documentado no item 6.3
     ("hoje sempre undefined em produção por D9") mas **não foi dito em voz alta na entrega** —
     lição: quando uma decisão antiga silencia uma feature nova, avisar na hora da entrega, não
     só no plano.
  2. **"Os flashcards aparecem apenas de forma sequencial e não aleatória."** Bug real:
     `buildSessionQueue` empilha os inéditos na ordem original de `simulation.questions`, sem
     nenhuma opção de embaralhar dentro do modo flashcard.
  3. **"Não entendi como fica a repetição."** O modelo estava simplificado demais (só dias, sem
     os degraus em minutos). Junto veio um **bug confirmado rodando**: `reinsertForRetry` na
     **última** lâmina da fila devolve o card na mesma posição — apertar "Não lembrei" ali
     mostra a mesma lâmina em loop até o aluno apertar outra coisa. `previewInterval` também
     ficou como código morto (exportado, nunca chamado).

  **Modelo-alvo (o Anki de verdade):** 4 estados por card — `new`, `learning`, `review`,
  `relearning` — com degraus de aprendizado `[1min, 10min]`, reaprendizado `[10min]`, graduação
  em 1 dia, "fácil" pulando direto pra 4 dias, ease inicial 2,5 (piso 1,3). Os 3 botões são
  Again/Good/Easy do Anki (o "Hard", 4º botão, continua deliberadamente fora).

  | Sub-item | O quê |
  |---|---|
  | 6.5.1 | Reescrever `utils/srs.ts`: `phase` + `stepIndex`, degraus em minutos, ratings renomeados `hard/medium/easy` → `again/good/easy` |
  | 6.5.2 | Escalonador de sessão no lugar da fila plana: filas separadas (novas / revisão / aprendendo-por-horário) e `pickNextCard()` — mostra card de aprendizado vencido, senão intercala novas+revisão, senão *learn ahead* de 20 min, senão encerra. Mata o bug da última lâmina |
  | 6.5.3 | Os 3 modos antigos deixam de ser alternativas ao flashcard e viram **configuração dentro dele**: ordem (sequencial/aleatória), intervalo específico (lâmina X a Y) e limite de lâminas novas por sessão (campo configurável, **padrão vazio = sem limite**, decisão do usuário) |
  | 6.5.4 | Botões perdem o rótulo "Revisa em X" (pedido do usuário); entram os **3 contadores do Anki** (Novas · Aprendendo · Revisão) no topo da sessão + box "como funciona" no setup — é o que responde "não entendi a repetição" |
  | 6.5.5 | Desempenho: **1 resultado por sessão** com o detalhe de cada lâmina no array `details: QuizDetail[]` (campo que já existe e já é usado pelo Simulado Teórico) + painel próprio de flashcards no Meu Desempenho vindo do SRS (dominadas / aprendendo / revisar hoje / retenção) |
  | 6.5.6 | **Zerar** o progresso de flashcards existente (decisão do usuário — era só o teste dele; sem código de compatibilidade a carregar pra sempre) |

  **Por que 1 resultado por sessão e não 1 por lâmina** (o usuário perguntou explicitamente se
  daria sobrecarga): daria, e do lado da **leitura**. `subscribeToMyResults` carrega todos os
  `quizResults` do aluno num listener sem limite. Com 1 doc por lâmina, um aluno acumula ~4.000
  documentos num semestre → ~4.000 leituras **cada vez** que abre o dashboard; a cota gratuita
  de 50.000 leituras/dia estoura com 12 alunos abrindo a tela uma vez. Também afogaria a média:
  cada lâmina viraria um "simulado de 1 questão" competindo com os simulados teóricos reais.
  Com 1 doc por sessão são ~80 documentos por semestre, e o `details[]` preserva a
  granularidade por lâmina dentro do próprio documento (~5 KB numa sessão de 50, contra o
  limite de 1 MB). **A repetição espaçada em si nunca dependeu disso** — o estado por lâmina
  (ease/lapses/dueAt) sempre viveu em `users/{uid}/flashcardProgress`, e é de lá que sai o
  "não lembrei volta mais rápido".

  **Testes:** `utils/srs.test.ts` reescrito (os 27 casos atuais cobrem o modelo antigo) —
  degraus de aprendizado e graduação, lapso levando pra reaprendizado, `pickNextCard`
  respeitando horário e *learn ahead*, **"Não lembrei" na última lâmina da fila** (o bug de hoje
  vira teste de regressão), ordem aleatória embaralhando de verdade, limite de novas
  respeitando "vazio = sem limite". Mais `npm run test:rules` e teste manual com 2 contas.

  ✅ **Entregue (2026-08-18):**
  - `utils/srs.ts` **reescrito** + `utils/srs.test.ts` com **46 casos** (o anterior tinha 27 e
    cobria o modelo antigo): 4 fases, degraus `[1min, 10min]` / reaprendizado `[10min]`,
    graduação em 1 dia, "fácil" em 4, ease 2,5 com piso 1,3. Ratings renomeados para o
    vocabulário do Anki (`again`/`good`/`easy`). `lapses` ficou fiel ao Anki (só card já
    graduada) e entrou um `againCount` separado, que conta todo "não lembrei" — é ele que
    ranqueia os pontos fracos, senão erro em card nova não apareceria no ranking.
  - Escalonador novo: `buildSession` / `pickNextCard` / `applyAnswerToSession`, com fila de
    aprendizado ordenada por horário e *learn ahead* de 20 min. **Bug do 6.3 vira teste de
    regressão**: com outras lâminas na fila, "não lembrei" agora mostra a PRÓXIMA (antes podia
    repetir a mesma na hora).
  - `SRS_SCHEMA_VERSION = 2` + `normalizeProgress`: o formato do 6.3 é **descartado na leitura**
    (vira card nova). Zerou sem script destrutivo e sem exigir Custom Claim — o doc antigo é
    sobrescrito card a card conforme o aluno estuda.
  - `features/lab/LabQuizView.tsx` reescrito: os 3 modos antigos viraram **configuração dentro
    do flashcard** (ordem sequencial/aleatória, intervalo específico, limite de novas com
    padrão vazio = sem limite). Botões sem rótulo de prazo; entraram os **3 contadores do Anki**
    (Novas/Aprendendo/Revisão), o box "como funciona a repetição" e uma tela de espera para
    quando só restam lâminas de aprendizado fora da janela de learn ahead.
  - `utils/resultsPolicy.ts`: **D9 revista** — `laboratorio` volta a contar. `LabQuizView` grava
    1 resultado por sessão com `details[]` por lâmina, contando **acerto de primeira** (lâmina
    errada e depois acertada na mesma sessão conta como erro — senão bastaria insistir até
    acertar para a nota fechar em 100%).
  - `views/StudentDashboardView.tsx`: painel "Flashcards do Laboratório Virtual" (em estudo /
    dominadas / aprendendo / para hoje) vindo do estado SRS, e o ranking de pontos fracos agora
    por `againCount`.
  - `features/lab/LabListView.tsx`: badge passou a contar só o que precisa VOLTAR
    (aprendendo + revisão vencida) — com o critério antigo, um baralho inédito inteiro
    apareceria como pendência.
  - Verificação: `typecheck` ✅, `vitest` **99/99** ✅, `test:rules` 26/26 ✅ (emulador),
    `lint` 22 (os mesmos pré-existentes) ✅, `build` ✅ + conferência de que as 7 classes de cor
    usadas na tela sobreviveram ao CSS de produção (lição do `deb2a85`).

  🟡 **Não coberto:** taxa de retenção histórica no painel (exigiria um log de revisões, que
  hoje não existe — só o estado atual de cada card é guardado). O painel mostra o que é
  honestamente derivável do estado.


- [x] **6.6 — Retomar sessão de flashcards de onde parou**
  *(concluído em 2026-08-18, a pedido do usuário: "caso o usuário precise parar de estudar e
  voltar depois")*.

  **Metade já funcionava** e vale registrar por quê: o estado de cada lâmina é gravado no
  instante do clique, então `buildSession` sempre devolveu as lâminas em aprendizado pra fila,
  no horário certo. O que se perdia ao fechar a aba era (a) a configuração escolhida, (b) a
  posição na fila e (c) — o mais grave — **o registro da sessão no Meu Desempenho**, porque
  `finishSession` só rodava no clique explícito de encerrar.

  - `utils/srs.ts`: `PersistedSession` (config + filas + placar parcial), `isResumableSession`
    (janela de 24h — `RESUMABLE_SESSION_MAX_AGE_MS`; depois disso as lâminas já mudaram de
    estado e retomar a fila velha seria mentira) e `restoreSession`, que descarta id de lâmina
    apagada pela monitoria enquanto o aluno estava fora.
  - `services/flashcardsService.ts`: a sessão em andamento **pega carona na mesma escrita que
    já salvava o card** (`upsertFlashcardCardState` com `activeSession`) — retomar não custa
    nenhuma operação a mais no banco. Mais `clearActiveSession` (via `deleteField`) e
    `fetchFlashcardProgressDoc`, que devolve cards + sessão. `stripUndefined` virou recursivo:
    `rangeStart`/`newLimit` são opcionais e o Firestore recusa `undefined`.
  - `features/lab/LabQuizView.tsx`: card "Sessão interrompida" no topo do setup, com
    **Continuar de onde parei** / **Começar sessão nova**. Nos dois caminhos o que já foi
    respondido vira resultado — inclusive ao começar do zero, senão o estudo abandonado sumiria
    do histórico.
  - Verificação: `typecheck` ✅, `vitest` **105/105** (52 no motor SRS) ✅, `lint` 22
    (pré-existentes) ✅, `build` ✅.

  🟡 **Limite conhecido:** a sessão só é gravada quando o aluno responde alguma lâmina — abrir
  a sessão e fechar sem responder nada não deixa rastro (e não precisa deixar). E a retomada é
  por simulação: estudar dois baralhos em paralelo mantém uma sessão pendente em cada, o que é
  o comportamento desejado.


- [x] **6.7 — Treino focado nas lâminas que o aluno erra**
  *(concluído em 2026-08-18, a pedido do usuário: "informar ao aluno (você tem 15 cards que não
  memorizou) e dar a opção dele selecionar e treinar apenas esses")*. É o **Custom Study /
  baralho filtrado** do Anki (`prop:lapses>N`), caso de uso real de véspera de prova.

  ⚠️ **Armadilha resolvida na definição:** o usuário pediu "não lembrou **ou lembrou com
  dificuldade**", mas no modelo de 3 botões o "Lembrei com esforço" é o **Good** do Anki — o
  caminho normal de quem acertou, não um sinal de dificuldade. Filtrar por ele jogaria o
  baralho inteiro no filtro. O critério adotado é **`againCount >= 1`** ("você já marcou 'Não
  lembrei' nessa lâmina"), o mesmo que já alimenta o "Pontos Fracos" no dashboard.

  - `utils/srs.ts`: `SessionFocus = 'all' | 'difficult'`, `isDifficultCard`,
    `countDifficultCards` e o ramo focado em `buildSession`, que **ignora a data de revisão de
    propósito** — o aluno quer treinar agora o que erra, mesmo que a repetição espaçada só
    fosse cobrar aquilo semana que vem. Limiar configurável (`minAgainCount`) já no motor,
    ainda sem UI.
  - `features/lab/LabQuizView.tsx`: bloco "Você tem N lâminas que ainda não memorizou" com
    alternância **Sessão normal / Treinar só essas N**. O limite de lâminas novas some no modo
    focado (não entra lâmina inédita), e o botão de começar muda de rótulo.
  - As respostas do treino focado **contam normalmente** para o agendamento e para o resultado
    da sessão — acertar ali empurra a lâmina pra frente como em qualquer revisão.
  - Verificação: `typecheck` ✅, `vitest` **111/111** (58 no motor SRS) ✅, `lint` 22
    (pré-existentes) ✅, `build` ✅ + classes de cor conferidas no CSS de produção.

  🟡 **Não feito:** link direto do "Pontos Fracos" do dashboard para o treino focado do baralho
  correspondente (hoje o link leva pra tela de configuração do lab, onde o aluno escolhe o modo).
  Exigiria passar o foco por query param na rota.


- [x] **6.8 — Liberação de funcionalidades por unidade (N1/N2) na aba "Acessos"**
  *(concluído em 2026-08-18)*.

  ⚠️ **Achado que reescreve o item 6.4:** o usuário apontou que "o 6.4 acredito que já
  funcionava antes" — e estava certo. A aba **"Acessos"** (`AdminDisciplines.tsx`) já bloqueava
  disciplina inteira (`status`) e funcionalidades específicas (`lockedFeatures`: Teórico,
  Prática, Materiais, Referências, IA). O 6.4 foi planejado sem que essa tela fosse examinada a
  fundo — **lição: mapear o que já existe antes de desenhar substituto**. A única lacuna real
  era a que a própria UI confessava num badge: *"Aplica a N1 e N2 Simetricamente"*.

  - `utils/featureLocks.ts` + `utils/featureLocks.test.ts` (16 casos): codificação
    `"quiz"` (global/legado) vs `"quiz:N1"` (por unidade) **dentro do mesmo array
    `lockedFeatures`** — sem migração de dados, documento antigo continua significando
    exatamente o que significava. `isFeatureLocked`, `setFeatureLock`, `getFeatureLockState`.
    O caso delicado tem teste próprio: **destravar a N1 a partir de uma trava global precisa
    expandir o global na N2 antes**, senão liberar a N1 liberaria a N2 junto.
  - `services/configService.ts`: `toggleDisciplineFeature` → `setDisciplineFeatureLock`
    (disciplina, funcionalidade, escopo `N1`/`N2`/`all`, travar ou não).
  - `features/admin/components/AdminDisciplines.tsx`: o badge simétrico virou **dois botões por
    funcionalidade** (N1 e N2, verde/vermelho) nas disciplinas modulares (HABMED/IESC/UCCG). UC
    não tem unidade e mantém o botão único de antes. O rótulo da funcionalidade fica âmbar
    quando só uma das unidades está travada.
  - `views/DisciplineView.tsx`: as travas passam a ser avaliadas **contra a unidade escolhida**.
    Em disciplina modular o aluno já passou pela tela de seleção nesse ponto, então a unidade é
    conhecida; em UC ela é nula e só a trava global vale. As mensagens de bloqueio agora dizem
    em qual unidade.
  - Verificação: `typecheck` ✅, `vitest` **127/127** ✅, `lint` 22 (pré-existentes) ✅,
    `build` ✅ + classes de cor conferidas no CSS de produção.

  🟡 **Limite importante, herdado (não introduzido aqui):** esta trava é **pedagógica, não de
  segurança** — vive em `config/disciplines` e é aplicada no cliente (`DisciplineView`).
  Contraria a regra 2 do CLAUDE.md se alguém a tratar como controle de acesso real: um aluno
  com o SDK do Firebase ainda consegue ler `questions`/`materials` da unidade "bloqueada"
  direto do Firestore. Para a turma piloto isso é aceitável (o objetivo é dosar o conteúdo, não
  proteger segredo), mas **não deve ser confundido com autorização**. Fechar essa fresta é o
  que sobrou do item 6.4 original.


- [x] **6.9 — Sessão linear + "memorizado" com definição explícita (correção do 6.5/6.7)**
  *(concluído em 2026-08-18, depois de o usuário testar o 6.5 em produção)*.

  **Três achados do teste, todos procedentes:**
  1. **Bug confirmado:** "às vezes clico em Não lembrei e o card não sai do lugar". Causa exata:
     o *learn ahead* do Anki em `pickNextCard` — com a fila principal vazia, ele adiantava o
     card de aprendizado que estava por vencer, que era **o card recém-respondido**. Acontecia
     sempre que o aluno errava o último card da fila.
  2. **Não memorizados só apareciam no fim da sessão**, não em tempo real.
  3. **O modelo intra-sessão do Anki confundia.** O usuário propôs outro, mais simples: a
     sessão corre **linearmente até o fim**, e o que não foi memorizado fica numa pilha que ele
     escolhe rodar depois.

  **Modelo novo, com a definição que o usuário deu:** *"o card é memorizado a partir de quando
  o usuário clica que lembrou com facilidade"*. Então `isMemorized(state) = lastRating ===
  'easy'` — e qualquer outra resposta, **inclusive "Lembrei com esforço"**, devolve o card à
  pilha de não memorizados, exatamente como ele descreveu.

  - `utils/srs.ts`: `SrsSession` virou **fila única** (`queue`), sem `learningQueue`.
    `pickNextCard` é o primeiro da fila ou fim; `applyAnswerToSession` só remove. Saíram o
    learn-ahead e a constante `LEARN_AHEAD_LIMIT_MIN`. Entraram `isMemorized`, `isUnmemorized`,
    `countUnmemorizedCards`, `listUnmemorizedCards`; `SessionFocus` passou de `'difficult'`
    (histórico: já errou alguma vez) para `'unmemorized'` (estado atual), que é o que o usuário
    descreveu. **O agendamento entre DIAS não mudou** — `answerCard` está intacto, com os
    degraus, ease e intervalos do Anki.
  - `getSessionCounts` virou placar **ao vivo** (restantes / memorizados / por memorizar),
    alimentado por estado React em vez de ref — era o que faltava para a contagem andar em
    tempo real.
  - `features/lab/LabQuizView.tsx`: sumiu o `setInterval` que reavaliava a fila a cada segundo
    (existia só por causa do learn-ahead) e a tela de espera que ele exigia. A tela final ganhou
    a pilha "N cards ficaram por memorizar" com botão **"Estudar esses N agora"**, que fecha a
    sessão atual (gravando o resultado) e abre uma rodada só com eles.
  - `PersistedSession.queue` é opcional e `queueOf()` lê o formato antigo
    (`mainQueue`/`learningQueue`) — sessão em voo no momento do deploy não se perde.
  - Vocabulário: "lâmina" → **"card"** na interface, a pedido do usuário.
  - Verificação: `typecheck` ✅, `vitest` **125/125** ✅, `lint` 22 (pré-existentes) ✅,
    `build` ✅ + 9 classes de cor conferidas no CSS de produção.

  🟡 **Desvio consciente do Anki, decidido pelo usuário:** o Anki reinsere o card errado dentro
  da própria sessão. Aqui não — a sessão é uma passagem só, e a repetição vem da rodada focada
  logo depois. A repetição espaçada **entre dias** continua idêntica.


- [x] **6.10 — Fim do calendário: flashcards viram sistema de pilhas**
  *(concluído em 2026-08-18)*. Pedido do usuário: *"não considere dias como unidade de medida,
  um usuário pode revisar todos os cards no mesmo dia, inclusive mais de uma vez"*.

  **Consequência que define o item:** o 6.9 já tinha tirado os minutos (degraus intra-sessão).
  Tirando também os dias, **não sobra relógio nenhum para agendar nada** — e guardar `ease`/
  `intervalDays`/`dueAt` sem nunca usar seria peso morto mentindo na tela (o dashboard chegava a
  exibir "Dominadas = intervalo ≥ 21 dias"). Então a repetição espaçada saiu inteira e o modelo
  virou **pilhas, estilo Leitner** — a outra família clássica de flashcard:

  ```
  inédito ──estudou──► [ não memorizado ] ──"Lembrei fácil"──► [ memorizado ]
                              ▲                                      │
                              └──"Não lembrei" / "Lembrei com esforço"┘
  ```

  Quem decide quando revisar é o aluno: baralho inteiro ou só a pilha do que falta memorizar,
  quantas vezes quiser, no mesmo dia ou não. **Nada é excluído de uma sessão por data.**

  - `utils/srs.ts` reescrito. `SrsCardState` agora é só contadores: `reviews`, `againCount`,
    `effortCount`, `easyCount`, `lastRating`. `lastReviewedAt` permanece, mas **explicitamente
    informativo** — registrar o tempo é diferente de agendar por ele. Sumiram `phase`,
    `stepIndex`, `ease`, `intervalDays`, `dueAt`, as constantes de degrau/intervalo e o
    parâmetro `now` de `buildSession`/`getDeckCounts`/`getDeckMastery`.
  - **Migração 2→3, não descarte** (diferente do 6.5): `normalizeCardState` converte o formato
    do 6.5 preservando `reviews`, `againCount` e `lastRating` — ou seja, **a pilha em que o card
    está sobrevive**. Formato 1 não tem como ser mapeado com honestidade e vira card inédito.
  - `getDeckCounts` → inéditos / por memorizar / memorizados. `getDeckMastery` idem, sem
    "dominadas" nem "para hoje". `getWeakestCards` desempata por `effortCount` (o `ease` não
    existe mais).
  - Textos da interface auditados: sumiram "volta no dia seguinte", "o intervalo cresce
    (1 → 3 → 8 dias)", "voltam sozinhos na data certa". O box "Como funciona" agora descreve o
    modelo real.
  - Vocabulário "lâmina" → **"card"** em toda a interface, concluindo o pedido do 6.9.
  - Verificação: `typecheck` ✅, `vitest` **118/118** ✅, `lint` 22 (pré-existentes) ✅,
    `build` ✅ + classes de cor conferidas no CSS.

  🟡 **O que se perde, dito com todas as letras:** não há mais agendamento automático de longo
  prazo. Antes o sistema trazia o card de volta sozinho depois de 3, 8, 20 dias — que é o
  mecanismo com evidência de retenção. Agora a iniciativa é 100% do aluno: se ele não abrir o
  baralho, nada o lembra. Se um dia fizer falta, o meio-termo natural seria espaçar por
  **rodadas** ("volta depois de 3 sessões") em vez de por calendário, mantendo a promessa de
  poder repassar tudo no mesmo dia.


- [x] **6.11 — Progresso não persistia em produção: rules não publicadas + falha silenciosa**
  *(concluído em 2026-08-18)*.

  🔴 **Causa raiz, e é uma falha de processo minha (Claude):** o `match
  /users/{uid}/flashcardProgress/{simId}` foi escrito no item 6.3 e testado **no emulador
  local** (`npm run test:rules`) — mas publicar `firestore.rules` em produção é **passo manual
  no console do Firebase**, e isso **nunca foi pedido ao usuário** na entrega do 6.3. Regras do
  Firestore não são recursivas: sem esse match publicado, toda leitura e escrita na subcoleção
  era **negada** em produção. O aluno estudava, a sessão funcionava inteira em memória, e o
  progresso evaporava ao sair — exatamente o sintoma relatado ("volta como se nunca tivesse
  usado").

  ⚠️ **O que fez isso durar dias sem ser notado:** os dois pontos de I/O engoliam o erro em
  `console.error`. A tela nunca reclamou. **Lição registrada: falha de gravação de progresso do
  aluno tem que ser visível na interface, não só no console.**

  - `features/lab/LabQuizView.tsx`: estado `saveError` + `SaveErrorBanner` no topo da tela de
    configuração E da sessão. Falha ao carregar avisa antes de começar ("o que você estudar
    agora pode não ser gravado"); falha ao gravar avisa na hora ("seu progresso NÃO está sendo
    salvo, avise a monitoria"). Gravação bem-sucedida limpa o aviso.
  - **Botão "Parar por aqui"** (pedido do usuário): sai da sessão **sem** contabilizá-la e
    **sem** apagar a sessão guardada — ao voltar, o card "Sessão interrompida" oferece
    continuar. Fica ao lado de "Encerrar sessão", que fecha, grava o resultado no Meu Desempenho
    e não dá para retomar. Os dois têm `title` explicando a diferença.
  - **Bug secundário corrigido:** "Começar sessão nova" contabilizava a sessão pendente mas não
    a apagava do banco — ela reaparecia como "interrompida" na visita seguinte, já contabilizada.
  - **Erro de português:** `ficou{n > 1 ? 'ram' : ''}` gerava **"ficouram"**. Plural de verbo não
    se faz concatenando sufixo — trocado por frase inteira condicional ("ficaram"/"ficou").
  - Verificação: `typecheck` ✅, `vitest` 118/118 ✅, `test:rules` ✅, `lint` 22 ✅, `build` ✅.

  ✅ **Resolvido em 2026-08-22:** o usuário publicou `firestore.rules` no console do Firebase e
  confirmou que o progresso passou a persistir. O banner de erro fica como rede de proteção
  permanente — se as regras divergirem de novo, a tela avisa em vez de fingir que salvou.

  📌 **Regra de processo que fica deste episódio:** toda alteração em `firestore.rules` só vale
  depois de **publicada no console** (ou `firebase deploy --only firestore:rules`). O
  `npm run test:rules` valida no emulador local e **não** publica nada. Quem entregar uma
  feature que dependa de regra nova tem que dizer isso em voz alta na entrega.


- [x] **6.12 — Viés na ordem da fila (modo Aleatória e Sequencial não cumpriam o rótulo)**
  *(concluído em 2026-08-22)*. Veio de uma pergunta do usuário: *"o aleatório é realmente
  aleatório ou tende a repetir?"*.

  **O `shuffle` estava correto** — Fisher-Yates sem viés, comprovado por teste novo: 12.000
  rodadas com PRNG determinístico, desvio máximo de 4,37% (3σ ≈ 4,7%). *(Vale registrar que o
  código anterior ao 6.5 usava `sort(() => Math.random() - 0.5)`, que é enviesado de verdade —
  se a percepção do usuário vinha de antes, procedia.)*

  **O viés estava na montagem da fila:** `buildSession` embaralhava já vistos e inéditos em
  grupos **separados** e concatenava. Consequências, as duas contrariando o rótulo na tela:
  - "Aleatória" sempre começava por card já visto — a ordem variava dentro de cada bloco, mas a
    estrutura era fixa, que é justamente o que se percebe como "repete".
  - "Sequencial" promete *"ordem cadastrada"* e jogava os já vistos para a frente.

  A separação em grupos agora serve **só** para aplicar o limite de inéditos; a ordem final é
  decidida sobre o conjunto inteiro. Dois testes novos: distribuição do Fisher-Yates e prova de
  que o modo aleatório não separa em blocos.

  Verificação: `typecheck` ✅, `vitest` **120/120** ✅, `lint` 22 ✅, `build` ✅.


- [x] **6.13 — Trava de regressão para o `content` do Tailwind**
  *(concluído em 2026-08-22; decisão delegada pelo usuário: "a decisão é sua")*.

  **Varredura visual descartada, com motivo:** corrigir o `content` no commit `deb2a85` já
  regenerou *todas* as classes de `features/` e `routes/` — não sobrou nada quebrado para
  procurar. Uma varredura só acharia gambiarras feitas para contornar cor sumida, e não há sinal
  disso. Verificação feita no lugar: **nenhum arquivo com `className` está fora dos globs
  escaneados hoje**.

  **O que foi feito, porque o risco é futuro:** `tailwind.config.test.ts` percorre o repositório
  atrás de arquivos com `className` e falha se algum estiver fora do `content` — criar uma pasta
  nova de componentes e esquecer de declará-la reintroduziria o mesmo bug silencioso.
  A trava foi **verificada falhando**: removendo `features/**` do config, o teste quebra e lista
  os 20+ arquivos afetados. Um segundo caso garante que o teste não passa por não ter varrido
  nada.

  Verificação: `typecheck` ✅, `vitest` **122/122** (10 arquivos) ✅, `lint` 22 ✅.


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
