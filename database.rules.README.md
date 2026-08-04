# Security Rules do Realtime Database

`database.rules.json` é a **cópia versionada** das regras publicadas em
`monitor-virtual-fms`. Publicar continua sendo manual:
Firebase Console → Realtime Database → aba **Regras** → colar → **Publicar**.

Se editar o arquivo, publique. Se publicar pelo console, traga a mudança para cá.
Regra divergente aqui é pior que regra ausente: dá falsa sensação de auditoria.

## O que estas regras garantem

| Caminho | Aluno logado | Admin | Anônimo |
|---|---|---|---|
| `users/$uid` | só o próprio nó | tudo | — |
| `periods`, `disciplines`, `questions`, `osce`, `labSimulations`, `feature_flags`, `discipline_config` | leitura | leitura + escrita | — |
| `quizResults` | lê **só via query** `orderByChild('userId').equalTo(uid)`; cria só com o próprio `userId` | tudo | — |
| `osceAnalytics` | só cria | tudo | — |
| `periodRequests` | só cria, com o próprio `userId` e `status: "pending"` | tudo | — |
| `surveys` | só cria | leitura | só cria |

## Duas armadilhas do RTDB que moldaram este desenho

**1. Permissão cascateia e não pode ser revogada.** Concedida num nó, vale para todos os
filhos — uma regra mais profunda não consegue tirá-la. Por isso não adianta proteger
`users/$uid/role` se o próprio dono escreve em `users/$uid`.
→ **O campo `role` é decorativo.** Serve só para a UI decidir o que mostrar. A autoridade
real é o UID nas regras. Um aluno pode escrever `role: "admin"` no próprio nó, ver o
painel aparecer, e não conseguir gravar absolutamente nada.

**2. Leitura é tudo-ou-nada por nó.** Não existe "leia a coleção, mas só os itens que são
seus". A saída é validar a **query** (`query.orderByChild` / `query.equalTo`) — o cliente é
obrigado a pedir exatamente o recorte permitido.
→ Por isso `views/StudentDashboardView.tsx` **precisa** usar
`query(ref(db,'quizResults'), orderByChild('userId'), equalTo(uid))`. Voltar a ler o nó
inteiro devolve `permission_denied`. O `.indexOn: ["userId"]` existe para essa query.

## Limitações conhecidas e aceitas

- **Gabaritos**: aluno logado lê `questions` inteiro, respostas incluídas. Inerente a quiz
  client-side. Corrigir exige mover a correção para o servidor — Etapa 6.
- **UID de admin hardcoded**: solução interina. Vira Custom Claims na Etapa 3, quando o
  projeto migrar para o Firestore. Novo admin, hoje, exige editar estas regras.
- **`surveys` aceita escrita anônima**: `/survey` é link aberto para a turma. Sem leitura,
  sem edição — só criação. Aceita rate limiting na Etapa 5.

## Verificar

```bash
# deve retornar "Permission denied"
curl -s "https://monitor-virtual-fms-default-rtdb.firebaseio.com/.json?shallow=true"
```
