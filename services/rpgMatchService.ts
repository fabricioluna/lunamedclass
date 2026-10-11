import { auth } from '../firebase';
import { localMatch, MatchError, MatchResult, MAX_TYPED_LENGTH, parseMatchApiResult } from '../utils/typedMatch';

// Cliente do /api/rpg-match (RPG digitado). Só a camada de serviços fala com o Firebase e com a
// API — a tela recebe esta função por prop e nunca importa firebase diretamente (regra 1 do
// CLAUDE.md).

export interface MatchInput {
  narrative: string;
  options: string[];
  text: string;
}

export { MatchError };
export type { MatchResult };

const TIMEOUT_MS = 15_000;

export async function matchTypedAction(input: MatchInput): Promise<MatchResult> {
  const text = input.text.trim().slice(0, MAX_TYPED_LENGTH);

  // O óbvio se resolve aqui, sem rede e sem custo.
  const local = localMatch(text, input.options);
  if (local.kind === 'match') return local;

  const user = auth.currentUser;
  if (!user) throw new MatchError('login');

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('/api/rpg-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ narrative: input.narrative, options: input.options, text }),
      signal: controller.signal,
    });
  } catch {
    throw new MatchError('unavailable');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) throw new MatchError('login');
  if (response.status === 429) throw new MatchError('busy');
  if (!response.ok) throw new MatchError('unavailable');

  try {
    return parseMatchApiResult(await response.json(), input.options.length);
  } catch {
    throw new MatchError('unavailable');
  }
}
