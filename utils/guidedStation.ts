import type { GuidedChoice } from '../types';

export const DEFAULT_GUIDED_PROMPT = 'O que você faz agora?';

// Embaralha a ordem das opções a cada cena — se a certa viesse sempre no mesmo lugar do
// cadastro, o aluno aprenderia a posição, não a conduta. Devolve cópias com o índice original
// (`key`), que identifica a opção mesmo que dois textos fossem iguais.
export interface KeyedChoice extends GuidedChoice {
  key: number;
}

export const shuffleChoices = (choices: GuidedChoice[], random: () => number = Math.random): KeyedChoice[] => {
  const keyed = choices.map((choice, key) => ({ ...choice, key }));
  for (let i = keyed.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [keyed[i], keyed[j]] = [keyed[j], keyed[i]];
  }
  return keyed;
};

export const isCorrectChoice = (choice: GuidedChoice): boolean => choice.correct === true;

// A cena é válida quando há pelo menos uma conduta certa e uma errada — sem errada não há o que
// narrar de consequência, e sem certa a cena nunca avança.
export const sceneHasValidChoices = (choices: GuidedChoice[]): boolean =>
  choices.some(isCorrectChoice) && choices.some((c) => !isCorrectChoice(c));
