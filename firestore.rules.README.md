# Security Rules do Firestore

`firestore.rules` é a **cópia versionada** das regras publicadas em `monitor-virtual-fms`.
Publicar continua sendo manual: Firebase Console → Firestore Database → aba **Regras** →
colar → **Publicar**.

Se editar o arquivo, publique. Se publicar pelo console, traga a mudança para cá. Regra
divergente aqui é pior que regra ausente: dá falsa sensação de auditoria.

**Antes da Etapa 3 não havia `firestore.rules` versionado neste repo** — o Firestore já
estava em uso (coleção `materials`) só com o que estivesse configurado direto no console.
Este arquivo é a primeira vez que essas regras existem como código.

## O que estas regras garantem

| Coleção | Aluno logado | Admin | Anônimo |
|---|---|---|---|
| `users/{uid}` | só o próprio nó | tudo | — |
| `config/{periods\|disciplines\|featureFlags}` | leitura | leitura + escrita | — |
| `questions`, `osceStations`, `labSimulations` | leitura | leitura + escrita | — |
| `materials` | leitura + cria (não edita nem apaga) | tudo | — |
| `quizResults` | lê/cria só o próprio (`userId == uid`) | tudo | — |
| `osceAnalytics` | só cria | tudo | — |
| `periodRequests` | só cria, com o próprio `userId` e `status: "pending"` | tudo | — |
| `surveys` | só cria | leitura | só cria |

## Diferença estrutural em relação ao RTDB

O Firestore não tem a cascata de permissão do RTDB (rule concedida num nó vale para todos
os filhos, sem como revogar mais fundo) — cada coleção/documento é avaliado por si. Isso
elimina o motivo original de `discipline_config` existir como nó separado: os campos de
override (`themes`, `references`, `status`, `lockedFeatures`) agora vivem direto dentro do
próprio doc `config/disciplines`, sem cascata para se preocupar.

Autoridade de admin: **Custom Claim `admin` no ID token**, não mais UID hardcoded nas regras
(ver `scripts/set-admin-claim.mjs`). O campo `users/{uid}.role` continua existindo só para a
UI decidir o que mostrar — nunca é a fonte de autoridade (mesma lição do RTDB, D5 no plano).

## Limitações conhecidas e aceitas (herdadas do RTDB, não pioraram nem melhoraram aqui)

- **Gabaritos**: aluno logado lê `questions` inteiro, respostas incluídas. Corrigir exige
  mover a correção para o servidor — Etapa 6.
- **`surveys` aceita escrita anônima**: `/survey` é link aberto para a turma. Sem leitura,
  sem edição — só criação. Aceita rate limiting na Etapa 5.

## Verificar

```bash
# no emulador ou com um usuário de teste: leitura anônima de quizResults deve falhar
# (Firestore não tem curl anônimo simples como o RTDB; testar via app ou emulador)
```
