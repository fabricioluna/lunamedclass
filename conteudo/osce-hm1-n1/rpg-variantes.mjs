// Casos de RPG GUIADO que fecham a cobertura em relação ao estático (2026-10-12): variantes de
// paramentação e desparamentação, PA em várias posições, PA com ruídos de difícil percepção e
// pulso/respiração com alteração de ritmo. Mesmas regras de rpg.mjs: só técnica, nada fora dos
// roteiros, nomes e valores fictícios.
//
// Paramentação e desparamentação são SEQUÊNCIAS, então os casos saem de um construtor a partir da
// ordem do roteiro (a mesma do estático). Por serem montadas, as consequências de ordem errada
// citam a regra da tabela de EPI e não inventam detalhes: origem 'D' (derivado do roteiro).

import { TEMAS } from './estacoes.mjs';

const BIO = 'Roteiro de Biossegurança (Profª Ingrid Cordeiro)';
const SV = 'Roteiro de Sinais Vitais (Prof. Michel Melo)';

const ok = (action, feedback) => ({ action, correct: true, feedback });
const no = (action, feedback) => ({ action, feedback });
const minuscula = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const cena = ({ passo, fonte, origem = 'R', narrative, patient, prompt, choices, reveals }) => ({
  passo, fonte, origem, narrative, patient, prompt, choices, reveals,
});

// ---------------------------------------------------------------------------
// PARAMENTAÇÃO — ordem: mãos → [touca] → avental → máscara → óculos → luvas (tabela de EPI, p. 8)
// ---------------------------------------------------------------------------

const MASCARA = {
  cirurgica: { acao: 'Colocar a máscara cirúrgica', nome: 'máscara cirúrgica', porque: 'Proteção respiratória básica (tabela de EPI, p. 8).' },
  pff2: { acao: 'Colocar a máscara PFF2/N95', nome: 'máscara PFF2/N95', porque: 'Filtra 94–95% ou mais das partículas e é a proteção para aerossóis (tabela de EPI, p. 8).' },
};
const LUVA = {
  procedimento: { acao: 'Calçar as luvas de procedimento', nome: 'luvas de procedimento', porque: 'Proteção contra contato direto, em procedimento não estéril (tabela de EPI, p. 8).' },
  esteril: { acao: 'Calçar as luvas cirúrgicas (estéreis)', nome: 'luvas cirúrgicas', porque: 'Proteção contra contato direto, em procedimento de técnica estéril (tabela de EPI, p. 8).' },
};

const montarParamentacao = ({ code, title, setting, scenario, touca, mascara, luva, aerossol, dicaMascara }) => {
  const m = MASCARA[mascara];
  const l = LUVA[luva];
  const outraM = MASCARA[mascara === 'pff2' ? 'cirurgica' : 'pff2'];
  const outraL = LUVA[luva === 'esteril' ? 'procedimento' : 'esteril'];

  const passos = [
    { id: 'hm', acao: 'Higienizar as mãos', nome: 'mãos higienizadas', porque: 'Principal medida de prevenção de IRAS; vem antes e entre as etapas (tabela de EPI, p. 8).' },
    ...(touca ? [{ id: 'touca', acao: 'Colocar a touca', nome: 'touca', porque: 'O protocolo da instituição exige touca; a ANVISA não a lista como obrigatória (tabela de EPI, p. 8).' }] : []),
    { id: 'avental', acao: 'Colocar o avental', nome: 'avental', porque: 'Proteção de tronco e membros contra contato (tabela de EPI, p. 8).' },
    { id: 'mascara', acao: m.acao, nome: m.nome, porque: m.porque },
    { id: 'oculos', acao: 'Colocar os óculos ou o face shield', nome: 'óculos', porque: 'Proteção da mucosa ocular, pelo risco de respingos (tabela de EPI, p. 8).' },
    { id: 'luva', acao: l.acao, nome: l.nome, porque: l.porque },
  ];

  const cenas = passos.map((p, i) => {
    const restantes = passos.slice(i + 1);
    const narrative = i === 0
      ? 'Você está diante da porta do quarto, com todo o material de proteção disponível. Você ainda não tocou em nenhum EPI.'
      : `Você já fez: ${passos.slice(0, i).map((x) => x.nome).join(', ')}. Faltam os demais EPIs da paramentação.`;

    const erradas = [];
    // Troca de tipo no próprio passo: é o que o caso testa (placa, protocolo, técnica estéril).
    if (p.id === 'mascara') {
      erradas.push(no(outraM.acao, aerossol
        ? `Há precaução para aerossóis: a proteção respiratória é a PFF2/N95. A máscara cirúrgica é a proteção básica, obrigatória em gotículas (tabela de EPI, p. 8).`
        : `Não há precaução para aerossóis neste caso: a máscara indicada é a cirúrgica. A PFF2/N95 é a proteção para aerossóis (tabela de EPI, p. 8).`));
    }
    if (p.id === 'luva') {
      erradas.push(no(outraL.acao, luva === 'esteril'
        ? 'O procedimento exige técnica estéril: as luvas são as cirúrgicas (estéreis), e não as de procedimento (tabela de EPI, p. 8).'
        : 'O procedimento não é estéril: bastam as luvas de procedimento. A luva estéril é para técnica estéril (tabela de EPI, p. 8).'));
    }
    if (p.id === 'avental' && !touca) {
      erradas.push(no('Colocar a touca', 'O protocolo da instituição não exige touca neste caso, e a ANVISA não a lista como obrigatória (tabela de EPI, p. 8).'));
    }
    if (p.id === 'hm' && touca) {
      erradas.push(no('Colocar a touca antes de higienizar as mãos', 'A higienização das mãos vem antes de tocar em qualquer EPI (tabela de EPI, p. 8).'));
    }
    // Outros EPIs fora de ordem (no máximo 2, os mais próximos).
    restantes.slice(0, 2).forEach((r) => {
      erradas.push(no(
        r.acao,
        r.id === 'luva'
          ? `Fora de ordem. As luvas são o último EPI da paramentação; calçadas antes da hora, você manipula os outros EPIs com elas. Agora é o momento de: ${minuscula(p.acao)} (tabela de EPI, p. 8).`
          : `Fora de ordem. Pela tabela de EPI (p. 8), o próximo passo é: ${minuscula(p.acao)}.`
      ));
    });
    if (i < passos.length - 1) {
      erradas.push(no('Dispensar este EPI, pois o paciente parece estável', 'A paramentação segue a tabela de EPI do caso (p. 8); nenhum item é dispensado por impressão sobre o paciente.'));
      erradas.push(no('Entrar no quarto agora e completar a paramentação lá dentro', 'A paramentação é concluída antes de entrar no quarto (tabela de EPI, p. 8).'));
    } else {
      erradas.push(no('Entrar no quarto sem luvas e calçá-las só se houver contato', 'Neste caso haverá contato com risco de respingos de sangue ou secreções: as luvas fazem parte da paramentação antes de entrar (tabela de EPI, p. 8).'));
      erradas.push(no('Dispensar as luvas, pois o avental já protege as mãos', 'O avental protege tronco e membros; as mãos exigem as luvas (tabela de EPI, p. 8).'));
    }

    return cena({
      passo: p.acao, fonte: 'p. 8', origem: 'D',
      narrative,
      prompt: i === 0 ? 'Qual é o primeiro passo?' : 'Qual é o próximo passo da paramentação?',
      choices: [ok(p.acao, p.porque), ...erradas.slice(0, 5)],
    });
  });

  const dicas = passos.map((p, i) => {
    if (i === 0) return 'Antes de tocar em qualquer EPI, o que as suas mãos precisam?';
    const feitos = passos.slice(0, i).map((x) => x.nome).join(', ');
    const extra = p.id === 'mascara' ? ` ${dicaMascara}` : p.id === 'luva' ? ' Releia: o procedimento é estéril ou não?' : '';
    return `Você já fez: ${feitos}. Pela tabela de EPI (p. 8), o que vem a seguir?${extra}`;
  });

  return {
    caso: {
      code, theme: TEMAS.biosseguranca, title, fonte: `${BIO}, p. 8`,
      setting, scenario,
      task: 'Faça a paramentação na ordem correta e escolhendo os EPIs que o caso pede (placa, protocolo, tipo de procedimento). Cada passo errado mostra a consequência.',
      tip: `Ordem da tabela de EPI (p. 8): higienizar as mãos → ${touca ? 'touca → ' : ''}avental → máscara → óculos/face shield → luvas.`,
      scenes: cenas,
    },
    dicas,
  };
};

const P_A = montarParamentacao({
  code: 'R14', title: 'Paramentação: sem touca · máscara cirúrgica · luva de procedimento',
  setting: 'Antecâmara do quarto de internação, com dispensador de preparação alcoólica, EPIs disponíveis e lixeira para resíduos infectantes. Na porta, não há placa de precaução por via aérea.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na enfermaria e participará do atendimento do Sr. J.R., 58 anos, internado neste quarto. O protocolo da instituição não exige touca. Durante o atendimento haverá risco de respingos de sangue ou secreções, e o procedimento não é estéril.',
  touca: false, mascara: 'cirurgica', luva: 'procedimento', aerossol: false,
  dicaMascara: 'Releia a porta: há placa de precaução por via aérea?',
});
const P_B = montarParamentacao({
  code: 'R15', title: 'Paramentação: com touca · PFF2/N95 · luva estéril',
  setting: 'Antecâmara do quarto de isolamento, com dispensador de preparação alcoólica, EPIs disponíveis e lixeira para resíduos infectantes. Na porta, há uma placa: PRECAUÇÃO PARA AEROSSÓIS.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na enfermaria e participará do atendimento do Sr. J.R., 58 anos, internado neste quarto. O protocolo da instituição exige touca para entrar. Durante o atendimento haverá risco de respingos de sangue ou secreções, e o procedimento exige técnica estéril.',
  touca: true, mascara: 'pff2', luva: 'esteril', aerossol: true,
  dicaMascara: 'Releia a placa da porta.',
});
const P_C = montarParamentacao({
  code: 'R16', title: 'Paramentação: com touca · máscara cirúrgica · luva estéril',
  setting: 'Antecâmara do quarto de internação, com dispensador de preparação alcoólica, EPIs disponíveis e lixeira para resíduos infectantes. Na porta, não há placa de precaução por via aérea.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática e participará do atendimento da Sra. M.C., 44 anos, internada neste quarto. O protocolo da instituição exige touca para entrar. Durante o atendimento haverá risco de respingos de sangue ou secreções, e o procedimento exige técnica estéril.',
  touca: true, mascara: 'cirurgica', luva: 'esteril', aerossol: false,
  dicaMascara: 'Releia a porta: há placa de precaução por via aérea?',
});
const P_D = montarParamentacao({
  code: 'R17', title: 'Paramentação: sem touca · PFF2/N95 · luva de procedimento',
  setting: 'Antecâmara do quarto de isolamento, com dispensador de preparação alcoólica, EPIs disponíveis e lixeira para resíduos infectantes. Na porta, há uma placa: PRECAUÇÃO PARA AEROSSÓIS.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática e participará do atendimento do Sr. A.T., 63 anos, internado neste quarto. O protocolo da instituição não exige touca. Durante o atendimento haverá risco de respingos de sangue ou secreções, e o procedimento não é estéril.',
  touca: false, mascara: 'pff2', luva: 'procedimento', aerossol: true,
  dicaMascara: 'Releia a placa da porta.',
});

// ---------------------------------------------------------------------------
// DESPARAMENTAÇÃO sem touca — luvas → mãos → avental → mãos → óculos → máscara → mãos (p. 8–9)
// ---------------------------------------------------------------------------

const REGIAO = {
  luvas: 'as mãos', avental: 'o seu corpo', oculos: 'os olhos', mascara: 'a boca e o nariz',
};

const desparamentacaoSemTouca = () => {
  const passos = [
    { id: 'luvas', acao: 'Retirar as luvas', nome: 'luvas', porque: 'A desparamentação começa pelas luvas (p. 8–9).' },
    { id: 'hm1', acao: 'Higienizar as mãos', nome: 'mãos higienizadas', porque: 'Depois das luvas, as mãos são higienizadas antes de seguir (p. 8–9).' },
    { id: 'avental', acao: 'Retirar o avental', nome: 'avental', porque: 'O avental sai depois das luvas e da higienização das mãos (p. 8–9).' },
    { id: 'hm2', acao: 'Higienizar as mãos', nome: 'mãos higienizadas de novo', porque: 'Depois do avental, as mãos são higienizadas outra vez (p. 8–9).' },
    { id: 'oculos', acao: 'Retirar os óculos ou o face shield', nome: 'óculos', porque: 'Sem touca, os óculos saem antes da máscara (p. 8–9).' },
    { id: 'mascara', acao: 'Retirar a máscara cirúrgica', nome: 'máscara cirúrgica', porque: 'A máscara é o último EPI a sair, antes da higienização final (p. 8–9).' },
    { id: 'hmf', acao: 'Higienizar as mãos (higienização final)', nome: 'higienização final', porque: 'A sequência termina com a higienização final das mãos (p. 8–9).' },
  ];

  const narrativas = [
    'O atendimento terminou. Você está ao lado da porta, usando avental, máscara cirúrgica, óculos e luvas. Esta é a fase de maior risco.',
    'As luvas foram retiradas. Suas mãos estão sem luvas, mas você ainda usa avental, óculos e máscara.',
    'Suas mãos estão higienizadas. O avental ainda cobre seu corpo; óculos e máscara continuam no lugar.',
    'O avental foi retirado. Ao tirá-lo, suas mãos tocaram a parte externa dele. Você ainda usa óculos e máscara.',
    'Suas mãos estão higienizadas. Restam os óculos e a máscara cirúrgica.',
    'Os óculos foram retirados. Resta apenas a máscara cirúrgica.',
    'Todos os EPIs foram retirados.',
  ];

  const cenas = passos.map((p, i) => {
    const erradas = [];
    if (p.id === 'hm1' || p.id === 'hm2') {
      const prox = passos[i + 1];
      erradas.push(no(`${prox.acao} sem higienizar as mãos`, `Suas mãos ainda carregam o que ficou do EPI anterior; você leva isso para ${REGIAO[prox.id]}. A sequência manda higienizar antes (p. 8–9).`));
      passos.slice(i + 2).filter((x) => REGIAO[x.id]).slice(0, 2).forEach((x) => {
        erradas.push(no(`${x.acao} sem higienizar as mãos`, `Além de fora de ordem, as mãos contaminadas tocam ${REGIAO[x.id]}. A sequência manda higienizar as mãos agora (p. 8–9).`));
      });
      erradas.push(no('Sair do quarto e higienizar as mãos só do lado de fora', 'A higienização das mãos faz parte da sequência dentro dela, entre as retiradas (p. 8–9).'));
    } else if (p.id === 'hmf') {
      erradas.push(no('Sair sem higienizar as mãos, pois já higienizou duas vezes', 'A higienização final faz parte da sequência (p. 8–9), mesmo depois das anteriores.'));
      erradas.push(no('Higienizar as mãos somente se estiverem visivelmente sujas', 'Na desparamentação, a higienização final faz parte da sequência (p. 8–9); ela não depende de sujidade visível.'));
      erradas.push(no('Calçar luvas novas antes de sair da área, para tocar nas superfícies', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5); a sequência termina com a higienização final das mãos (p. 9).'));
    } else {
      passos.slice(i + 1).filter((x) => REGIAO[x.id]).slice(0, 3).forEach((x) => {
        erradas.push(no(
          x.acao,
          i === 0
            ? `Com as luvas ainda calçadas, você manipula esse EPI com as mãos contaminadas e leva a contaminação para ${REGIAO[x.id]}. A desparamentação começa pelas luvas (p. 8–9).`
            : `Fora de ordem: agora é o momento de ${minuscula(p.acao)} (p. 8–9). A sequência existe para proteger ${REGIAO[x.id]}.`
        ));
      });
      erradas.push(no('Retirar a touca', 'Você não está usando touca neste caso; a sequência é a que não inclui esse EPI (p. 8–9).'));
      erradas.push(no('Retirar o propé', 'Você não está usando propé; ele não é recomendado rotineiramente (p. 8).'));
      if (p.id === 'mascara') {
        erradas.push(no('Retirar a máscara PFF2/N95', 'Você está usando a máscara cirúrgica, e não a PFF2/N95.'));
        erradas.push(no('Higienizar as mãos e manter a máscara até chegar à sala dos professores', 'A máscara faz parte dos EPIs a retirar na desparamentação, antes da higienização final (p. 8–9).'));
      }
    }
    return cena({
      passo: p.acao, fonte: 'p. 8–9', origem: 'D',
      narrative: narrativas[i],
      prompt: i === passos.length - 1 ? 'Para encerrar, o que você faz?' : 'O que vem agora?',
      choices: [ok(p.acao, p.porque), ...erradas.slice(0, 5)],
    });
  });

  const dicas = passos.map((p, i) => {
    if (i === 0) return 'Qual EPI está mais exposto ao contato com o paciente? A desparamentação começa por ele.';
    const feitos = passos.slice(0, i).map((x) => x.nome).join(', ');
    return `Você já fez: ${feitos}. O que vem a seguir na sequência sem touca (p. 8–9)?`;
  });

  return {
    caso: {
      code: 'R18', theme: TEMAS.biosseguranca, title: 'Desparamentação sem touca: máscara cirúrgica', fonte: `${BIO}, p. 8–9`,
      setting: 'Saída do quarto de internação. Dispensador de preparação alcoólica ao lado da porta e lixeira para resíduos infectantes.',
      scenario: 'Você é acadêmico(a) de Medicina e acaba de concluir, com a equipe, o atendimento ao Sr. J.R., 58 anos, internado neste quarto. Você está usando: avental, máscara cirúrgica, óculos, luvas de procedimento. O protocolo da instituição não exige touca. É preciso sair sem se contaminar e sem contaminar o ambiente.',
      task: 'Retire os EPIs na ordem correta, com a higienização das mãos nos momentos adequados. Cada passo fora de ordem mostra o que ele leva para o seu corpo.',
      tip: 'Desparamentação sem touca (p. 8–9): luvas → higienizar as mãos → avental → higienizar as mãos → óculos/face shield → máscara → higienização final. Com PFF2/N95 a ordem é a mesma.',
      scenes: cenas,
    },
    dicas,
  };
};

const P_DESP = desparamentacaoSemTouca();

// ---------------------------------------------------------------------------
// SINAIS VITAIS
// ---------------------------------------------------------------------------

const R19 = {
  code: 'R19', theme: TEMAS.sinaisVitais, title: 'Pressão arterial em várias posições: idoso, primeira avaliação', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório da UBS, silencioso. O Sr. J.A. está de pé junto à porta. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial do Sr. J.A., 74 anos, que comparece pela primeira vez à UBS. Ele já foi abordado, entendeu o procedimento e consentiu. Esta é a primeira avaliação da pressão arterial dele na unidade. Acabou de chegar à sala e ainda não está em repouso.',
  task: 'Meça a pressão arterial pelo método indireto, nas várias posições que o roteiro pede para este tipo de paciente. Nesta estação você não precisa classificar o resultado.',
  tip: 'Em idosos na primeira avaliação, em quem faz controle de terapêutica e quando há suspeita de hipotensão postural, a medida é feita nas várias posições: sentado, deitado ou em pé (p. 3). A artéria braquial fica ao nível do coração em qualquer posição.',
  scenes: [
    cena({
      passo: 'Repouso de 3 a 5 minutos, em local tranquilo', fonte: 'p. 3',
      narrative: 'O Sr. J.A. acabou de subir a rampa da UBS e entra na sala.',
      patient: 'Sr. J.A.: "Cheguei agora, doutor(a). Pode medir já?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Pedir que ele se sente e aguardar o repouso de 3 a 5 minutos, em local tranquilo', 'A medida exige repouso de 3 a 5 minutos, em local tranquilo (p. 3).'),
        no('Medir imediatamente, já que ele está de pé e disponível', 'Sem o repouso de 3 a 5 minutos, a medida não reflete a pressão de repouso (p. 3).'),
        no('Aguardar apenas 1 minuto e medir', 'O repouso deve ser de 3 a 5 minutos (p. 3).'),
        no('Medir já em pé, porque é um idoso e a posição é a que importa', 'A medida começa com o paciente em repouso e sentado; as outras posições vêm depois (p. 3).'),
      ],
    }),
    cena({
      passo: 'Posição sentado e artéria braquial ao nível do coração', fonte: 'p. 3',
      narrative: 'Passaram-se 5 minutos de repouso. O Sr. J.A. está sentado, com o braço direito sobre o colo.',
      prompt: 'Como você posiciona o paciente e o braço?',
      choices: [
        ok('Sentado, confortável, com a artéria braquial ao nível do coração (4º espaço intercostal), braço ligeiramente fletido e apoiado em superfície firme, palma da mão para cima', 'Sentado, com a braquial ao nível do coração, o braço fletido e apoiado e a palma para cima (p. 3).'),
        no('Deixar o braço pendente ao lado do corpo', 'Com o braço abaixo do nível do coração, a medida sai alterada; a braquial deve ficar no 4º espaço intercostal (p. 3).'),
        no('Deixar o braço apoiado sobre o colo', 'O colo deixa o braço abaixo do nível do coração (p. 3).'),
        no('Deixar o braço esticado para frente, sem apoio', 'O braço deve ficar ligeiramente fletido e apoiado em superfície firme (p. 3).'),
      ],
    }),
    cena({
      passo: 'Localizar a artéria braquial e colocar o manguito 2 cm acima da fossa cubital', fonte: 'p. 3',
      narrative: 'O braço está bem posicionado. O manguito está aberto sobre a mesa.',
      prompt: 'Como você coloca o manguito?',
      choices: [
        ok('Localizar as pulsações da artéria braquial e colocar o manguito 2 cm acima da fossa cubital', 'Você localiza a braquial e posiciona o manguito 2 cm acima da fossa cubital (p. 3).'),
        no('Colocar o manguito sobre a fossa cubital', 'O manguito fica 2 cm acima da fossa cubital (p. 3).'),
        no('Colocar o manguito 2 cm abaixo da fossa cubital', 'O manguito deve ficar 2 cm ACIMA da fossa cubital (p. 3).'),
        no('Colocar o manguito sem localizar a pulsação da artéria braquial', 'As pulsações da artéria braquial devem ser localizadas antes (p. 3).'),
      ],
    }),
    cena({
      passo: 'Método palpatório', fonte: 'p. 3–5',
      narrative: 'O manguito está colocado. Você ainda não sabe até que valor insuflar.',
      prompt: 'Como você estima a pressão sistólica?',
      choices: [
        ok('Palpar o pulso radial, insuflar o manguito até o pulso desaparecer e desinsuflar lentamente até ele reaparecer', 'O reaparecimento do pulso é a pressão sistólica pelo método palpatório, que evita subestimar a sistólica quando há hiato auscultatório (p. 3–5).'),
        no('Dispensar o método palpatório e insuflar até um valor fixo', 'Sem estimar a sistólica antes, você não sabe até onde insuflar (p. 3–5).'),
        no('Palpar o pulso carotídeo para estimar a sistólica', 'No método palpatório usa-se o pulso radial (pode ser também a braquial) (p. 3), e não a carótida.'),
        no('Já colocar o estetoscópio e insuflar sem palpar o pulso', 'O método palpatório vem antes da ausculta (p. 3–5).'),
      ],
    }),
    cena({
      passo: 'Ausculta: insuflar 30 mmHg acima, soltar 2–3 mmHg/s e registrar', fonte: 'p. 4',
      narrative: 'Você estimou a sistólica pelo método palpatório e colocou o estetoscópio sobre a artéria braquial.',
      prompt: 'Como você faz a ausculta e o registro?',
      choices: [
        ok('Insuflar cerca de 30 mmHg acima da sistólica palpatória, soltar o ar de forma contínua a 2–3 mmHg por segundo e registrar a sistólica no 1º ruído e a diastólica no desaparecimento dos sons', 'Insuflação 30 mmHg acima do valor palpatório, desinsuflação contínua a 2–3 mmHg/s, sistólica na fase I e diastólica na fase V de Korotkoff (p. 4).'),
        no('Insuflar 30 mmHg acima, soltar o ar rapidamente e registrar a diastólica no abafamento', 'A desinsuflação deve ser contínua e lenta, 2–3 mmHg por segundo; a diastólica é registrada quando os sons desaparecem (p. 4).'),
        no('Insuflar até o máximo do aparelho e soltar o ar a 10 mmHg por segundo', 'Insuflar cerca de 30 mmHg acima da sistólica palpatória, e não o máximo, e soltar a 2–3 mmHg por segundo (p. 4).'),
        no('Insuflar cerca de 30 mmHg acima, soltar em degraus e registrar a sistólica no 2º ruído', 'A desinsuflação é contínua, e a sistólica é registrada no primeiro ruído (p. 4).'),
      ],
    }),
    cena({
      passo: 'Posicionar o paciente em pé', fonte: 'p. 3',
      narrative: 'Você registrou as pressões com o Sr. J.A. sentado. Por ser um idoso na primeira avaliação, o roteiro pede a medida nas várias posições.',
      patient: 'Sr. J.A.: "Acabou, doutor(a)? Posso ir embora?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Explicar que falta mais uma medida e posicioná-lo em pé', 'Nestes casos a medida deve ser feita nas várias posições: sentado, deitado ou em pé (p. 3).'),
        no('Encerrar a avaliação com a medida sentado', 'Neste caso, a medida deve ser feita nas várias posições (p. 3).'),
        no('Repetir a medida sentado e considerar a avaliação completa', 'Repetir na mesma posição não atende ao que o roteiro pede para este paciente: as várias posições (p. 3).'),
        no('Deixá-lo em pé e já medir, sem esperar nem ajustar o braço', 'Em qualquer posição, a braquial deve ficar ao nível do coração, com o braço apoiado (p. 3).'),
      ],
    }),
    cena({
      passo: 'Artéria braquial ao nível do coração com o paciente em pé', fonte: 'p. 3',
      narrative: 'O Sr. J.A. está em pé. O braço dele está pendente ao lado do corpo.',
      prompt: 'Como você prepara o braço para a nova medida?',
      choices: [
        ok('Manter a artéria braquial ao nível do coração (4º espaço intercostal), com o braço apoiado', 'Em qualquer posição, a artéria braquial deve ficar ao nível do coração (p. 3).'),
        no('Medir com o braço pendente, pois o paciente já está em pé', 'Com o braço pendente, ele fica abaixo do nível do coração e a medida sai alterada (p. 3).'),
        no('Medir com o braço levantado acima da cabeça', 'A braquial deve ficar ao nível do coração, nem acima nem abaixo (p. 3).'),
        no('Dispensar o apoio do braço, pois o paciente consegue segurá-lo sozinho', 'O braço deve ficar apoiado, com a braquial ao nível do coração (p. 3).'),
      ],
    }),
    cena({
      passo: 'Repetir a medida e registrar a pressão de cada posição', fonte: 'p. 3',
      narrative: 'O braço está apoiado, com a artéria braquial ao nível do coração.',
      prompt: 'O que você faz para concluir?',
      choices: [
        ok('Repetir a medida com a mesma técnica e registrar as pressões obtidas em cada posição', 'Repete-se a medida com a mesma técnica e registram-se as pressões de cada posição (p. 3).'),
        no('Repetir a medida com uma técnica mais rápida, só pela ausculta', 'A técnica é a mesma, incluindo o método palpatório e a desinsuflação lenta (p. 3–5).'),
        no('Registrar apenas a pressão em pé, pois é a mais recente', 'Registram-se as pressões obtidas em cada posição (p. 3).'),
        no('Registrar uma média das duas posições em um único valor', 'Cada posição tem o seu valor registrado, sem média (p. 3).'),
      ],
    }),
  ],
};

const R20 = {
  code: 'R20', theme: TEMAS.sinaisVitais, title: 'Pressão arterial: quando os ruídos são de difícil percepção', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório da UBS, silencioso. O Sr. P.N. está sentado, com apoio para o braço. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial do Sr. P.N., 63 anos, que veio a uma consulta de rotina. Ele já foi abordado, entendeu o procedimento e consentiu. Durante a ausculta, você percebe que os ruídos estão sendo percebidos com dificuldade.',
  task: 'Meça a pressão arterial pelo método indireto e resolva a dificuldade de ouvir os ruídos sem perder a técnica. Nesta estação você não precisa classificar o resultado.',
  tip: 'Se os ruídos forem percebidos com dificuldade, aumentar o ângulo entre o braço e o tórax, retificando a artéria, facilita a ausculta (p. 4).',
  scenes: [
    cena({
      passo: 'Repouso e posição do paciente', fonte: 'p. 3',
      narrative: 'O Sr. P.N. acabou de chegar. O material está pronto sobre a mesa.',
      prompt: 'Como você começa?',
      choices: [
        ok('Garantir repouso de 3 a 5 minutos, em local tranquilo, com o paciente sentado e confortável', 'A medida exige repouso de 3 a 5 minutos, em local tranquilo, com o paciente sentado e confortável (p. 3).'),
        no('Medir assim que ele se sentar', 'Sem o repouso de 3 a 5 minutos, a medida não reflete a pressão de repouso (p. 3).'),
        no('Fazer o repouso com ele em pé ao lado da mesa', 'A posição preferencial é sentado, confortável (p. 3).'),
        no('Aguardar o repouso com ele conversando sobre o trabalho', 'O local deve ser tranquilo e sem ruídos que atrapalhem a ausculta (p. 3).'),
      ],
    }),
    cena({
      passo: 'Braço ao nível do coração, manguito 2 cm acima da fossa cubital', fonte: 'p. 3',
      narrative: 'Passaram-se 5 minutos de repouso.',
      prompt: 'Como você posiciona o braço e o manguito?',
      choices: [
        ok('Braquial ao nível do coração (4º espaço intercostal), braço ligeiramente fletido e apoiado, palma para cima; localizar as pulsações e colocar o manguito 2 cm acima da fossa cubital', 'Posição do braço e manguito corretos (p. 3).'),
        no('Braço pendente ao lado do corpo e manguito sobre a fossa cubital', 'O braço deve ficar com a braquial ao nível do coração e o manguito 2 cm ACIMA da fossa cubital (p. 3).'),
        no('Braço apoiado no colo e manguito 2 cm abaixo da fossa cubital', 'O colo deixa o braço abaixo do coração, e o manguito fica acima da fossa cubital (p. 3).'),
        no('Braço esticado sem apoio e manguito colocado sem localizar a braquial', 'O braço deve ficar ligeiramente fletido e apoiado, e a pulsação da braquial deve ser localizada antes (p. 3).'),
      ],
    }),
    cena({
      passo: 'Método palpatório', fonte: 'p. 3–5',
      narrative: 'O manguito está colocado.',
      prompt: 'Como você estima a pressão sistólica?',
      choices: [
        ok('Palpar o pulso radial, insuflar até o pulso desaparecer e desinsuflar lentamente até ele reaparecer', 'O reaparecimento do pulso dá a sistólica pelo método palpatório (p. 3–5).'),
        no('Dispensar o método palpatório e insuflar direto', 'Sem estimar a sistólica antes, você não sabe até onde insuflar (p. 3–5).'),
        no('Palpar o pulso carotídeo para estimar a sistólica', 'No método palpatório usa-se o pulso radial (p. 3), e não a carótida.'),
        no('Estimar a sistólica pelo tamanho do manguito', 'A estimativa é feita palpando o pulso radial durante a desinsuflação (p. 3–5).'),
      ],
    }),
    cena({
      passo: 'Ausculta: insuflar 30 mmHg acima e soltar 2–3 mmHg/s', fonte: 'p. 4',
      narrative: 'Você colocou o estetoscópio sobre a artéria braquial. Ao insuflar e começar a soltar o ar, quase não ouve os ruídos.',
      patient: 'Sr. P.N.: "Está tudo bem, doutor(a)? O senhor ficou calado."',
      prompt: 'Qual é o seu primeiro passo para a ausculta?',
      choices: [
        ok('Insuflar cerca de 30 mmHg acima da sistólica palpatória e soltar o ar de forma contínua a 2–3 mmHg por segundo', 'A técnica de insuflação e desinsuflação não muda quando os ruídos são fracos (p. 4).'),
        no('Insuflar até o máximo do aparelho para ouvir melhor', 'Insuflar cerca de 30 mmHg acima da sistólica palpatória, e não o máximo (p. 4).'),
        no('Soltar o ar rapidamente para os sons ficarem mais altos', 'A desinsuflação deve ser contínua e lenta, a 2–3 mmHg por segundo (p. 4).'),
        no('Soltar o ar até zero e desinsuflar de novo logo em seguida, repetidas vezes', 'Insuflar e esvaziar repetidamente não faz parte da técnica; resolva a dificuldade e conclua a ausculta (p. 4).'),
      ],
    }),
    cena({
      passo: 'Facilitar a ausculta: aumentar o ângulo entre o braço e o tórax', fonte: 'p. 4',
      narrative: 'Os ruídos continuam difíceis de ouvir. A artéria está com o braço bem junto ao corpo.',
      prompt: 'O que você faz para facilitar a ausculta?',
      choices: [
        ok('Aumentar o ângulo entre o braço e o tórax, retificando a artéria', 'Aumentar o ângulo entre o braço e o tórax, retificando a artéria, facilita a ausculta dos sons (p. 4).'),
        no('Pedir que o paciente fale mais alto para cobrir o ruído da sala', 'A conversa atrapalha a ausculta; o recurso do roteiro é retificar a artéria (p. 4).'),
        no('Apertar mais o manguito sobre o braço', 'O manguito fica na posição indicada; o recurso do roteiro é aumentar o ângulo entre o braço e o tórax (p. 4).'),
        no('Trocar a medida para o pulso radial e registrar o valor palpatório como pressão', 'O valor palpatório é só uma estimativa da sistólica; ele não substitui a ausculta (p. 3–5).'),
      ],
    }),
    cena({
      passo: 'Registrar sistólica e diastólica', fonte: 'p. 4',
      narrative: 'Com a artéria retificada, você consegue ouvir os ruídos.',
      prompt: 'Como você registra os valores?',
      choices: [
        ok('Registrar a sistólica no aparecimento do primeiro ruído e a diastólica no desaparecimento dos sons', 'Sistólica na fase I e diastólica na fase V de Korotkoff (p. 4).'),
        no('Registrar a sistólica no desaparecimento dos sons e a diastólica no primeiro ruído', 'Os valores estão invertidos: a sistólica é o primeiro ruído, e a diastólica é o desaparecimento dos sons (p. 4).'),
        no('Registrar apenas a sistólica, já que a diastólica é difícil de ouvir', 'Registram-se a sistólica e a diastólica (p. 4).'),
        no('Registrar a diastólica no início do abafamento dos sons', 'A diastólica é registrada no desaparecimento dos sons (fase V) (p. 4).'),
      ],
    }),
  ],
};

const R21 = {
  code: 'R21', theme: TEMAS.sinaisVitais, title: 'Pulso e respiração: quando o ritmo está alterado', fonte: `${SV}, p. 2–3`,
  setting: 'Consultório da UBS, silencioso. O Sr. G.M. está sentado, com o braço apoiado. Sobre a mesa: relógio com marcador de segundos e bloco de anotações. As mãos e o material já foram higienizados.',
  scenario: 'Você é acadêmico(a) de Medicina e avaliará o pulso e a respiração do Sr. G.M., 52 anos. Ele já foi abordado, entendeu o procedimento e consentiu. Ao palpar o pulso radial, você percebe, nos primeiros 30 segundos, que o ritmo está alterado.',
  task: 'Avalie o pulso e a respiração com a técnica do roteiro. Nesta estação você não precisa classificar os valores.',
  tip: 'Se houver alteração de ritmo ou de amplitude nos primeiros 30 segundos, a contagem do pulso vai até 1 minuto. A respiração é contada sem avisar o paciente (p. 2).',
  scenes: [
    cena({
      passo: 'Palpar o pulso radial', fonte: 'p. 2',
      narrative: 'O Sr. G.M. está sentado, com o antebraço apoiado e a palma para cima.',
      prompt: 'O que você faz para avaliar o pulso?',
      choices: [
        ok('Palpar o pulso radial', 'O pulso radial é o local de palpação nesta avaliação (p. 2).'),
        no('Palpar o pulso na veia jugular', 'Pulso é palpado em artéria; a jugular é uma veia.'),
        no('Contar os batimentos pelo relógio, sem palpar', 'O pulso é avaliado palpando a artéria, para perceber também ritmo, força e amplitude (p. 2).'),
        no('Palpar o pulso carotídeo nos dois lados ao mesmo tempo', 'Neste paciente consciente, o pulso é palpado na artéria radial (p. 2).'),
      ],
    }),
    cena({
      passo: 'Contar por 30 segundos, observando ritmo, força e amplitude', fonte: 'p. 2',
      narrative: 'Você está com os dedos sobre o pulso radial do Sr. G.M.',
      prompt: 'Como você conta o pulso?',
      choices: [
        ok('Contar as pulsações por 30 segundos, observando ritmo, força e amplitude', 'A contagem começa por 30 segundos, observando ritmo, força e amplitude (p. 2).'),
        no('Contar por 10 segundos e multiplicar por 6', 'O roteiro manda contar por 30 segundos para observar também ritmo e amplitude (p. 2).'),
        no('Contar sem olhar o relógio, só pela sensação', 'A contagem é feita com o tempo marcado (p. 2).'),
        no('Contar apenas as pulsações, sem observar o ritmo', 'Observam-se ritmo, força e amplitude durante a contagem (p. 2).'),
      ],
    }),
    cena({
      passo: 'Alteração de ritmo: manter a contagem até 1 minuto', fonte: 'p. 2',
      narrative: 'Nos primeiros 30 segundos, o ritmo do pulso está irregular.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Manter a contagem até completar 1 minuto', 'Com alteração de ritmo ou de amplitude nos primeiros 30 segundos, a contagem vai até 1 minuto (p. 2).'),
        no('Multiplicar o valor dos 30 segundos por 2 e encerrar', 'A multiplicação por 2 só vale quando não há alteração de ritmo ou amplitude (p. 2).'),
        no('Repetir a contagem de 30 segundos e fazer a média', 'Com ritmo alterado, a contagem é mantida até 1 minuto, e não há média (p. 2).'),
        no('Desistir do pulso radial e trocar para o pulso carotídeo', 'A técnica continua no radial, estendendo a contagem para 1 minuto (p. 2).'),
      ],
    }),
    cena({
      passo: 'Continuar palpando o pulso e observar discretamente o tórax', fonte: 'p. 3',
      narrative: 'Você completou 1 minuto de contagem do pulso.',
      prompt: 'Como você passa à avaliação da respiração?',
      choices: [
        ok('Continuar palpando o pulso e começar a observar discretamente o tórax', 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo (p. 3).'),
        no('Soltar o pulso e avisar que vai contar a respiração', 'Avisar leva ao controle voluntário do padrão respiratório; a palpação do pulso continua (p. 2–3).'),
        no('Pedir ao paciente que respire fundo para facilitar a contagem', 'A respiração é avaliada sem interferir no padrão do paciente (p. 2).'),
        no('Esperar um tempo, soltar o pulso e contar a respiração depois', 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo (p. 3).'),
      ],
    }),
    cena({
      passo: 'Contar a respiração por 1 minuto, sem informar o paciente', fonte: 'p. 2',
      narrative: 'Você mantém os dedos no pulso e observa o tórax do Sr. G.M.',
      patient: 'Sr. G.M.: "O que o senhor está fazendo agora, doutor(a)?"',
      prompt: 'Como você conta a respiração?',
      choices: [
        ok('Contar a respiração durante 1 minuto, sem informar o paciente', 'Informar o paciente leva ao controle voluntário do padrão respiratório (p. 2).'),
        no('Dizer que vai contar a respiração e pedir que ele respire normalmente', 'Ao saber, o paciente tende a controlar a respiração (p. 2).'),
        no('Contar a respiração por 15 segundos e multiplicar por 4', 'Para a respiração, o roteiro manda contar durante 1 minuto (p. 2).'),
        no('Contar a respiração por 30 segundos e multiplicar por 2', 'Para a respiração, o roteiro manda contar durante 1 minuto (p. 2).'),
      ],
    }),
    cena({
      passo: 'Avaliar ritmo, amplitude e tiragem', fonte: 'p. 2–3',
      narrative: 'Você completou 1 minuto de contagem da respiração.',
      prompt: 'O que você avalia além da frequência?',
      choices: [
        ok('Avaliar ritmo, amplitude e tiragem da respiração', 'Além da frequência, avaliam-se ritmo, amplitude e tiragem (p. 2–3).'),
        no('Avaliar apenas a frequência, pois o resto é do exame do tórax', 'Ritmo, amplitude e tiragem também fazem parte da avaliação da respiração (p. 2–3).'),
        no('Avaliar a cor das unhas e a temperatura da pele', 'Esses itens não fazem parte da avaliação da respiração neste roteiro.'),
        no('Avaliar a pressão arterial no mesmo braço, sem soltar o pulso', 'A pressão arterial é uma avaliação à parte, com a técnica própria (p. 3–5).'),
      ],
    }),
  ],
};

export const casosVariantes = [P_A.caso, P_B.caso, P_C.caso, P_D.caso, P_DESP.caso, R19, R20, R21];

// Dica de nível 1 de cada cena, na ordem. Os casos montados trazem as suas; os escritos à mão usam as de baixo.
export const dicasVariantes = {
  R14: P_A.dicas,
  R15: P_B.dicas,
  R16: P_C.dicas,
  R17: P_D.dicas,
  R18: P_DESP.dicas,
  R19: [
    'O que o paciente precisa antes de qualquer medida?',
    'Qual a posição do paciente e onde fica a artéria braquial em relação ao coração?',
    'O manguito tem uma posição definida em relação à fossa cubital.',
    'Há um método para estimar a sistólica antes da ausculta. Qual?',
    'Margem de insuflação, velocidade de soltura do ar e o que marca a sistólica e a diastólica: o roteiro define os três.',
    'Este paciente é idoso e está na primeira avaliação. O roteiro pede a medida em mais de uma posição?',
    'Em qualquer posição, onde deve ficar a artéria braquial?',
    'A técnica da segunda medida é a mesma ou diferente? E o que se registra?',
  ],
  R20: [
    'O que o paciente precisa antes de qualquer medida e em que posição fica?',
    'Onde fica a artéria braquial em relação ao coração e onde vai o manguito?',
    'Antes da ausculta há um método para estimar a sistólica.',
    'Os ruídos são fracos, mas a técnica de insuflação e soltura do ar continua a mesma.',
    'O roteiro cita um recurso que muda a posição do braço em relação ao tórax.',
    'Qual ruído marca a sistólica e o que marca a diastólica?',
  ],
  R21: [
    'Em qual artéria se palpa o pulso de um paciente consciente?',
    'Por quanto tempo se conta o pulso no início, e o que mais se observa?',
    'O ritmo está alterado. Isso muda o tempo de contagem?',
    'A respiração é avaliada logo após o pulso. Os dedos soltam o pulso?',
    'Por quanto tempo se conta a respiração? E o paciente fica sabendo?',
    'Além da frequência, o que mais se avalia na respiração?',
  ],
};
