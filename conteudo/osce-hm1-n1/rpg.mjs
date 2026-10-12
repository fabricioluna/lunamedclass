// Casos de RPG GUIADO (sem IA) — HM1 / N1. Fonte única: os 2 roteiros de aula prática.
//
// Decisões do usuário (2026-10-10): o aluno age por ESCOLHAS GUIADAS a cada cena (sem texto livre
// e sem IA); o realismo vem de (1) consequência do erro narrada, (2) valores aferidos revelados
// só depois da técnica correta e (3) diálogo com o paciente. Só técnica: nenhuma decisão
// clínica, nenhuma classificação de valor. Mesma regra do estático: nada de fonte externa.
//
// Cada cena tem `passo` (o passo do roteiro que ela cobra), `fonte` (página) e `origem`:
// 'R' = texto do roteiro; 'D' = derivado do roteiro (recorte, junção ou negação) — validar.
// Nomes, idades e valores aferidos são fictícios e não alteram a técnica.

import { TEMAS } from './estacoes.mjs';
import { casosVariantes } from './rpg-variantes.mjs';

const BIO = 'Roteiro de Biossegurança (Profª Ingrid Cordeiro)';
const SV = 'Roteiro de Sinais Vitais (Prof. Michel Melo)';

const ok = (action, feedback) => ({ action, correct: true, feedback });
const no = (action, feedback) => ({ action, feedback });
const cena = ({ passo, fonte, origem = 'R', narrative, patient, prompt, choices, reveals }) => ({
  passo, fonte, origem, narrative, patient, prompt, choices, reveals,
});

// ---------------------------------------------------------------------------
// BIOSSEGURANÇA
// ---------------------------------------------------------------------------

const R1 = {
  code: 'R1', theme: TEMAS.biosseguranca, title: 'Visita ao paciente em precaução para aerossóis', fonte: `${BIO}, p. 5–8`,
  setting: 'Corredor da enfermaria, em frente ao quarto privativo 12. Na bancada ao lado da porta: máscaras PFF2/N95 e cirúrgicas, avental, luvas, óculos e dispensador de preparação alcoólica. Lixeira para resíduo infectante na saída do quarto.',
  scenario: 'Você é acadêmico(a) de Medicina e vai conversar com o Sr. R.C., 47 anos, internado com suspeita de tuberculose, para colher a história clínica. Não haverá contato com sangue ou secreções. Você ainda não tocou em nenhum EPI.',
  task: 'Conduza a entrada no quarto, a conversa e a saída aplicando a técnica correta de biossegurança. Nesta estação você não precisa realizar a entrevista clínica.',
  tip: 'Precaução para aerossóis: higienização das mãos, máscara PFF2/N95 (profissional), quarto privativo com a porta sempre fechada e máscara cirúrgica no paciente durante o transporte (p. 6–7).',
  scenes: [
    cena({
      passo: 'Higienizar as mãos (primeiro passo da paramentação)', fonte: 'p. 8',
      narrative: 'Você está no corredor, diante da porta fechada do quarto 12. Na porta, a placa: PRECAUÇÃO PARA AEROSSÓIS. Sobre a bancada estão os EPIs.',
      patient: 'Enfermeira do plantão: "O Sr. R.C. já foi avisado da sua visita. Fique à vontade."',
      prompt: 'Qual é o seu primeiro passo?',
      choices: [
        ok('Higienizar as mãos', 'Você higieniza as mãos antes de tocar em qualquer EPI. É o primeiro passo da paramentação (p. 8).'),
        no('Colocar a máscara cirúrgica', 'A máscara cirúrgica não oferece a filtração exigida em aerossóis: o profissional usa a PFF2/N95 (p. 6). E a higiene das mãos vem antes de tocar em qualquer EPI.'),
        no('Abrir a porta para cumprimentar o paciente', 'Ao abrir a porta sem proteção, você se expõe aos aerossóis e deixa que escapem para o corredor. A porta fica sempre fechada e a máscara é colocada antes de entrar (p. 6).'),
        no('Calçar as luvas de procedimento', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5), o que não ocorrerá aqui. E a higiene das mãos vem primeiro.'),
        no('Colocar o avental', 'O avental não faz parte da precaução para aerossóis (p. 6–7), e a higiene das mãos vem antes de tocar em qualquer EPI.'),
      ],
    }),
    cena({
      passo: 'Colocar a máscara PFF2/N95 antes de entrar no quarto', fonte: 'p. 6 e 8',
      narrative: 'Com as mãos higienizadas, você pega a máscara PFF2/N95 na bancada. O paciente aguarda dentro do quarto, de porta fechada.',
      prompt: 'Como você usa a máscara?',
      choices: [
        ok('Colocar a máscara PFF2/N95 antes de entrar no quarto', 'A PFF2/N95 filtra ≥ 94–95% das partículas (p. 8) e deve estar colocada antes de entrar no quarto (p. 6).'),
        no('Entrar no quarto e só depois colocar a máscara PFF2/N95', 'Você entraria sem proteção num ambiente com aerossóis. A máscara é colocada antes de entrar no quarto (p. 6).'),
        no('Colocar a máscara cirúrgica no lugar da PFF2/N95', 'Em aerossóis, a máscara cirúrgica é a do paciente durante o transporte; o profissional usa a PFF2/N95 (p. 6).'),
        no('Colocar a máscara PFF2/N95 no paciente antes da conversa', 'A PFF2/N95 é a máscara do profissional; o paciente usa máscara cirúrgica, e apenas durante o transporte (p. 6).'),
      ],
    }),
    cena({
      passo: 'Manter a porta do quarto sempre fechada', fonte: 'p. 6',
      narrative: 'Com a PFF2/N95 ajustada ao rosto, você se prepara para entrar. Dentro do quarto, o paciente tosse ao ouvir você se aproximar.',
      patient: 'Sr. R.C.: "Pode entrar, doutor(a). Desculpe a tosse."',
      prompt: 'Como você entra no quarto?',
      choices: [
        ok('Entrar e manter a porta do quarto fechada', 'Você entra e fecha a porta atrás de si: a porta do quarto deve ficar SEMPRE fechada (p. 6).'),
        no('Entrar e deixar a porta aberta para ventilar o ambiente', 'Com a porta aberta, o ar do quarto chega ao corredor e expõe quem passa por ali. A porta deve ficar SEMPRE fechada (p. 6).'),
        no('Pedir que o paciente venha até o corredor para conversar', 'O transporte do paciente deve ser evitado; quando necessário, ele usa máscara cirúrgica durante toda a permanência fora do quarto (p. 6). Aqui não há necessidade.'),
        no('Entrar e calçar as luvas de procedimento dentro do quarto', 'Não haverá contato com sangue ou secreções, então as luvas não fazem parte desta paramentação (p. 5–7).'),
      ],
    }),
    cena({
      passo: 'Paciente fora do quarto: máscara cirúrgica durante toda a permanência', fonte: 'p. 6–7',
      narrative: 'A conversa chega ao fim. O paciente se levanta da cama e olha para a porta.',
      patient: 'Sr. R.C.: "Doutor(a), estou há dias aqui dentro. Posso ir ao corredor esticar as pernas?"',
      prompt: 'O que você orienta?',
      choices: [
        ok('Orientar que sair do quarto deve ser evitado e, se for necessário, ele use máscara cirúrgica durante toda a permanência fora do quarto', 'O transporte do paciente deve ser evitado; quando necessário, ele usa máscara cirúrgica durante toda a sua permanência fora do quarto (p. 6).'),
        no('Liberar o passeio pelo corredor, sem máscara', 'O paciente circularia pela enfermaria sem barreira, expondo outras pessoas aos aerossóis. Se sair for necessário, ele usa máscara cirúrgica (p. 6).'),
        no('Orientar que ele saia usando a máscara PFF2/N95', 'A PFF2/N95 é a máscara do profissional; o paciente usa máscara cirúrgica fora do quarto (p. 6).'),
        no('Abrir a porta e deixá-la aberta para ele circular', 'A porta do quarto deve ficar SEMPRE fechada (p. 6).'),
      ],
    }),
    cena({
      passo: 'Retirar a máscara PFF2/N95 (único EPI desta precaução)', fonte: 'p. 6–8', origem: 'D',
      narrative: 'Você se despede do paciente. Você está usando somente a máscara PFF2/N95.',
      prompt: 'Qual é o próximo passo da desparamentação?',
      choices: [
        ok('Retirar a máscara PFF2/N95', 'Nesta precaução você usa apenas a máscara PFF2/N95; ela é o EPI a retirar (p. 6–8). A higienização final das mãos vem logo depois.'),
        no('Retirar o avental', 'Você não está usando avental: ele não faz parte da precaução para aerossóis (p. 6–7).'),
        no('Retirar as luvas', 'Você não está usando luvas nesta precaução (p. 6–7).'),
        no('Higienizar as mãos antes de retirar a máscara', 'A higienização final das mãos é o último passo, depois de retirar a máscara (p. 8).'),
      ],
    }),
    cena({
      passo: 'Higienização final das mãos', fonte: 'p. 8', origem: 'D',
      narrative: 'A máscara foi retirada. Você está de volta ao corredor, ao lado do dispensador de preparação alcoólica.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos', 'A higienização final das mãos encerra a desparamentação (p. 8).'),
        no('Sair sem higienizar as mãos, pois não houve contato com o paciente', 'A sequência da desparamentação termina com a higienização final das mãos (p. 8–9).'),
        no('Higienizar as mãos somente se estiverem visivelmente sujas', 'Na desparamentação, a higienização final faz parte da sequência (p. 8–9); ela não depende de sujidade visível.'),
        no('Calçar luvas para tocar na maçaneta ao sair', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5); a sequência termina com a higienização das mãos.'),
      ],
    }),
  ],
};

const R2 = {
  code: 'R2', theme: TEMAS.biosseguranca, title: 'Exame físico em paciente em precaução de contato', fonte: `${BIO}, p. 5–8`,
  setting: 'Corredor da enfermaria e quarto de isolamento. Na bancada ao lado da porta: avental, luvas de procedimento, máscaras, óculos e dispensador de preparação alcoólica. Dentro do quarto, estetoscópio, termômetro e esfigmomanômetro de uso exclusivo do paciente. Lixeira para resíduo infectante na saída.',
  scenario: 'Você é acadêmico(a) de Medicina e fará o exame físico do Sr. A.L., 71 anos, internado há 4 dias com infecção por microrganismo multirresistente. Na porta do quarto está a placa: PRECAUÇÃO DE CONTATO. Não há risco de respingos de sangue ou secreções. Você ainda não entrou no quarto.',
  task: 'Realize a paramentação, o uso do equipamento do quarto e a desparamentação na ordem correta. Nesta estação você não precisa realizar o exame físico em si.',
  tip: 'Na precaução de contato: higienização das mãos, avental e luvas, e quarto privativo. Termômetro, esfigmomanômetro e estetoscópio são de uso exclusivo do paciente (p. 6).',
  scenes: [
    cena({
      passo: 'Higienizar as mãos antes de tocar em qualquer EPI', fonte: 'p. 8',
      narrative: 'Você está no corredor, em frente ao quarto de isolamento. Na porta, a placa: PRECAUÇÃO DE CONTATO. Os EPIs estão na bancada.',
      patient: 'Enfermeira do plantão: "O avental e as luvas estão aí. O estetoscópio dele fica dentro do quarto."',
      prompt: 'Qual é o seu primeiro passo?',
      choices: [
        ok('Higienizar as mãos', 'Você higieniza as mãos antes de tocar em qualquer EPI (p. 8).'),
        no('Colocar a máscara PFF2/N95', 'A PFF2/N95 pertence à precaução para aerossóis (p. 6); a placa aqui é de contato.'),
        no('Calçar as luvas de procedimento', 'A higiene das mãos vem antes de qualquer EPI, e as luvas são o último item da paramentação (p. 8).'),
        no('Entrar no quarto e se paramentar lá dentro', 'Avental e luvas devem ser colocados imediatamente antes do contato com o paciente ou com as superfícies próximas (p. 6): você precisa estar paramentado antes de tocar em qualquer coisa do quarto.'),
      ],
    }),
    cena({
      passo: 'Colocar o avental', fonte: 'p. 6 e 8',
      narrative: 'Suas mãos estão higienizadas. Você vai examinar o paciente e não há risco de respingos.',
      prompt: 'Qual EPI você coloca em seguida?',
      choices: [
        ok('Colocar o avental', 'Na precaução de contato, avental e luvas são usados durante toda a manipulação do paciente (p. 6). O avental vem antes das luvas (p. 8).'),
        no('Calçar as luvas antes do avental', 'Na sequência de paramentação, as luvas são o último EPI (p. 8).'),
        no('Colocar os óculos ou o face shield', 'Óculos e face shield são indicados quando há risco de respingos (p. 7); o caso informa que não há.'),
        no('Colocar a máscara cirúrgica', 'A máscara cirúrgica não faz parte da precaução de contato (p. 6–7).'),
      ],
    }),
    cena({
      passo: 'Calçar as luvas de procedimento', fonte: 'p. 6 e 8',
      narrative: 'O avental está colocado.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Calçar as luvas de procedimento', 'As luvas completam a paramentação da precaução de contato (p. 6 e 8).'),
        no('Calçar as luvas cirúrgicas (estéreis)', 'O exame físico não é um procedimento estéril: o EPI indicado é a luva de procedimento (p. 9–10).'),
        no('Dispensar as luvas, pois o contato com o paciente será breve', 'Na precaução de contato, avental e luvas são usados durante toda a manipulação do paciente (p. 6).'),
        no('Colocar o propé', 'O propé não é recomendado rotineiramente: a evidência de redução de transmissão é limitada (p. 8).'),
      ],
    }),
    cena({
      passo: 'Equipamentos de uso exclusivo do paciente', fonte: 'p. 6',
      narrative: 'Você entra no quarto. Sobre a mesa de cabeceira há um estetoscópio, um termômetro e um esfigmomanômetro. Você vai auscultar o paciente.',
      patient: 'Sr. A.L.: "Esses aparelhos ficam aqui só pra mim, doutor(a)?"',
      prompt: 'Qual estetoscópio você usa?',
      choices: [
        ok('Usar o estetoscópio que está no quarto, de uso exclusivo do paciente', 'Termômetro, esfigmomanômetro e estetoscópio devem ser de uso exclusivo do paciente (p. 6): você usa o do quarto e ele permanece ali.'),
        no('Usar o seu estetoscópio pessoal e levá-lo para o próximo paciente', 'Na precaução de contato, os equipamentos são de uso exclusivo do paciente (p. 6): levar o seu para outros pacientes leva o microrganismo junto.'),
        no('Usar o estetoscópio de uso coletivo da enfermaria', 'O equipamento coletivo circula entre pacientes; na precaução de contato ele deve ser de uso exclusivo do paciente (p. 6).'),
        no('Dispensar o estetoscópio para não tocar nos aparelhos do quarto', 'Os equipamentos do quarto são de uso exclusivo do paciente (p. 6): usá-los no exame é o previsto, e o exame não deve ser dispensado.'),
      ],
    }),
    cena({
      passo: 'Retirar as luvas (primeiro passo da desparamentação)', fonte: 'p. 8', origem: 'D',
      narrative: 'O exame terminou. Você está de avental e luvas, ao lado do leito, e vai se desparamentar.',
      prompt: 'Qual EPI você retira primeiro?',
      choices: [
        ok('Retirar as luvas', 'A desparamentação começa pelas luvas (p. 8).'),
        no('Retirar o avental', 'Com as luvas ainda calçadas, você manipula o avental com as mãos contaminadas. A sequência retira primeiro as luvas e higieniza as mãos (p. 8).'),
        no('Higienizar as mãos com as luvas calçadas', 'As luvas saem primeiro; a higienização das mãos vem logo depois de retirá-las (p. 8).'),
        no('Manter o avental e as luvas até terminar de atender os outros pacientes', 'Avental e luvas são retirados logo após o uso, higienizando as mãos em seguida (p. 6).'),
      ],
    }),
    cena({
      passo: 'Higienizar as mãos após retirar as luvas', fonte: 'p. 8', origem: 'D',
      narrative: 'As luvas foram retiradas e descartadas em lixo infectante. Você ainda está de avental.',
      prompt: 'O que vem agora?',
      choices: [
        ok('Higienizar as mãos', 'Depois das luvas, as mãos são higienizadas e só então o avental sai (p. 8).'),
        no('Retirar o avental sem higienizar as mãos', 'A sequência manda higienizar as mãos depois das luvas e antes do avental (p. 8): sem isso, você leva ao avental e ao corpo o que ficou nas mãos.'),
        no('Colocar luvas novas para retirar o avental', 'Não há esse passo na sequência da desparamentação (p. 8).'),
        no('Pegar o prontuário para anotar antes de higienizar as mãos', 'As mãos são higienizadas logo depois de retirar as luvas (p. 8), antes de tocar em outras superfícies.'),
      ],
    }),
    cena({
      passo: 'Retirar o avental', fonte: 'p. 6 e 8', origem: 'D',
      narrative: 'Suas mãos estão higienizadas. Você ainda está de avental.',
      prompt: 'Qual é o próximo passo?',
      choices: [
        ok('Retirar o avental', 'Avental e luvas são retirados logo após o uso (p. 6); na sequência, o avental vem depois da higienização das mãos (p. 8).'),
        no('Retirar a máscara cirúrgica', 'Você não está usando máscara nesta precaução (p. 6–7).'),
        no('Retirar os óculos ou o face shield', 'Você não está usando óculos nem face shield: não havia risco de respingos (p. 7).'),
        no('Sair do quarto de avental e retirá-lo mais tarde', 'Avental e luvas são retirados logo após o uso (p. 6).'),
      ],
    }),
    cena({
      passo: 'Higienização final das mãos', fonte: 'p. 6 e 8', origem: 'D',
      narrative: 'O avental foi retirado.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos', 'Retirados luvas e avental, as mãos são higienizadas em seguida (p. 6); a sequência termina com a higienização final (p. 8).'),
        no('Sair do quarto sem higienizar as mãos', 'A sequência da desparamentação termina com a higienização final das mãos (p. 8).'),
        no('Higienizar as mãos só na pia do posto, depois de outras tarefas', 'Retire os EPIs logo após o uso, higienizando as mãos em seguida (p. 6).'),
        no('Calçar luvas novas para sair do quarto', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5); a sequência termina com a higienização das mãos.'),
      ],
    }),
  ],
};

const R3 = {
  code: 'R3', theme: TEMAS.biosseguranca, title: 'Visita ao paciente em precaução para gotículas', fonte: `${BIO}, p. 5–8`,
  setting: 'Corredor da enfermaria, em frente ao quarto privativo 8. Na bancada ao lado da porta: máscaras cirúrgicas e PFF2/N95, avental, luvas, óculos e dispensador de preparação alcoólica.',
  scenario: 'Você é acadêmico(a) de Medicina e vai conversar com a Sra. M.F., 34 anos, internada com suspeita de influenza, para colher a história clínica. Na porta do quarto está a placa: PRECAUÇÃO PARA GOTÍCULAS. Não haverá contato com sangue ou secreções. Você ainda não entrou no quarto.',
  task: 'Conduza a entrada, a conversa e a saída aplicando a técnica correta de biossegurança. Nesta estação você não precisa realizar a entrevista clínica.',
  tip: 'Precaução para gotículas: higienização das mãos, máscara cirúrgica (profissional), máscara cirúrgica no paciente durante o transporte e quarto privativo (p. 6–7).',
  scenes: [
    cena({
      passo: 'Higienizar as mãos antes de tocar em qualquer EPI', fonte: 'p. 8',
      narrative: 'Você está no corredor, diante da porta do quarto 8. Na porta, a placa: PRECAUÇÃO PARA GOTÍCULAS. Os EPIs estão na bancada.',
      prompt: 'Qual é o seu primeiro passo?',
      choices: [
        ok('Higienizar as mãos', 'Você higieniza as mãos antes de tocar em qualquer EPI (p. 8).'),
        no('Colocar a máscara PFF2/N95', 'A PFF2/N95 pertence à precaução para aerossóis (p. 6); em gotículas o profissional usa máscara cirúrgica (p. 6–7).'),
        no('Calçar as luvas de procedimento', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5), o que não ocorrerá aqui. E a higiene das mãos vem primeiro.'),
        no('Entrar sem EPI, já que você ficará a um braço de distância', 'A precaução para gotículas exige máscara cirúrgica para o profissional (p. 6–7), independentemente da distância.'),
      ],
    }),
    cena({
      passo: 'Colocar a máscara cirúrgica (profissional)', fonte: 'p. 6–8',
      narrative: 'Suas mãos estão higienizadas. A porta do quarto está à sua frente.',
      prompt: 'Qual EPI você coloca antes de entrar?',
      choices: [
        ok('Colocar a máscara cirúrgica', 'Na precaução para gotículas, o profissional usa máscara cirúrgica (p. 6–7).'),
        no('Colocar a máscara PFF2/N95', 'A PFF2/N95 é da precaução para aerossóis; em gotículas a máscara do profissional é a cirúrgica (p. 6–7).'),
        no('Colocar o avental', 'O avental não faz parte da precaução para gotículas (p. 6–7), e não haverá contato com sangue ou secreções.'),
        no('Colocar os óculos ou o face shield', 'Óculos, máscara e avental são indicados quando há risco de contato com sangue ou secreções (p. 5); o caso informa que não haverá.'),
      ],
    }),
    cena({
      passo: 'Paciente fora do quarto: máscara cirúrgica durante toda a permanência', fonte: 'p. 6–7',
      narrative: 'Você já está no quarto, conversando com a paciente. No corredor, um técnico chega com uma maca para levá-la a um exame de imagem.',
      patient: 'Sra. M.F.: "O pessoal do raio-X veio me buscar. Preciso ir assim mesmo?"',
      prompt: 'O que você orienta?',
      choices: [
        ok('Orientar que, se o transporte for necessário, ela use máscara cirúrgica durante toda a permanência fora do quarto', 'O transporte do paciente deve ser evitado; quando necessário, ele usa máscara cirúrgica durante toda a sua permanência fora do quarto (p. 6).'),
        no('Liberar o transporte sem máscara, pois o exame é rápido', 'Sem máscara, a paciente circula pelo hospital sem barreira. Durante todo o tempo fora do quarto ela usa máscara cirúrgica (p. 6).'),
        no('Orientar que ela vá sem máscara porque o técnico usará a dele', 'A máscara cirúrgica do paciente durante o transporte faz parte da precaução (p. 6); a proteção do técnico não a substitui.'),
        no('Orientar que ela use a máscara PFF2/N95 no transporte', 'A PFF2/N95 é a máscara do profissional em aerossóis; o paciente usa máscara cirúrgica durante o transporte (p. 6).'),
      ],
    }),
    cena({
      passo: 'Retirar a máscara cirúrgica (único EPI desta precaução)', fonte: 'p. 6–8', origem: 'D',
      narrative: 'A conversa terminou e a paciente já voltou do exame. Você está usando somente a máscara cirúrgica.',
      prompt: 'Qual é o próximo passo da desparamentação?',
      choices: [
        ok('Retirar a máscara cirúrgica', 'Nesta precaução você usa apenas a máscara cirúrgica; ela é o EPI a retirar (p. 6–8).'),
        no('Retirar o avental', 'Você não está usando avental nesta precaução (p. 6–7).'),
        no('Retirar as luvas', 'Você não está usando luvas nesta precaução (p. 6–7).'),
        no('Higienizar as mãos antes de retirar a máscara', 'A higienização final das mãos é o último passo, depois de retirar a máscara (p. 8).'),
      ],
    }),
    cena({
      passo: 'Higienização final das mãos', fonte: 'p. 8', origem: 'D',
      narrative: 'A máscara foi retirada. Você está de volta ao corredor.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos', 'A higienização final das mãos encerra a desparamentação (p. 8).'),
        no('Sair sem higienizar as mãos, pois não houve contato físico com a paciente', 'A sequência da desparamentação termina com a higienização final das mãos (p. 8–9).'),
        no('Higienizar as mãos somente se estiverem visivelmente sujas', 'Na desparamentação, a higienização final faz parte da sequência (p. 8–9); ela não depende de sujidade visível.'),
        no('Colocar uma nova máscara cirúrgica para circular pela enfermaria', 'A máscara faz parte da precaução desta visita; ao final ela é retirada e as mãos são higienizadas (p. 8).'),
      ],
    }),
  ],
};

// Desparamentação com consequência (variação com touca + PFF2/N95, a mais completa — p. 9).
// Cada erro é uma etapa fora de ordem: a narrativa mostra o que ele leva para o corpo.
const R4 = {
  code: 'R4', theme: TEMAS.biosseguranca, title: 'Desparamentação: a fase de maior risco', fonte: `${BIO}, p. 8–9`,
  setting: 'Saída do quarto de isolamento. Dispensador de preparação alcoólica ao lado da porta e lixeira para resíduos infectantes.',
  scenario: 'Você é acadêmico(a) de Medicina e acaba de concluir, com a equipe, o atendimento ao Sr. J.R., 58 anos, internado neste quarto. Você está usando: avental, máscara PFF2/N95, óculos, luvas de procedimento e touca (o protocolo da instituição exige touca). É preciso sair sem se contaminar e sem contaminar o ambiente.',
  task: 'Retire os EPIs na ordem correta, com a higienização das mãos nos momentos adequados. Cada passo fora de ordem mostra o que ele leva para o seu corpo.',
  tip: 'Desparamentação com touca (p. 9): luvas → higienizar as mãos → avental → higienizar as mãos → óculos/face shield → touca → máscara → higienização final.',
  scenes: [
    cena({
      passo: 'Retirar as luvas', fonte: 'p. 8–9',
      narrative: 'O atendimento terminou. Você está ao lado da porta, usando avental, máscara PFF2/N95, óculos, luvas e touca. Esta é a fase de maior risco.',
      prompt: 'Qual é o primeiro EPI a retirar?',
      choices: [
        ok('Retirar as luvas', 'A desparamentação começa pelas luvas (p. 8–9).'),
        no('Retirar a máscara PFF2/N95', 'Com as luvas ainda calçadas, você toca o rosto para retirar a máscara e leva a contaminação para a face e as mucosas. A desparamentação começa pelas luvas (p. 8–9).'),
        no('Retirar o avental', 'Com as luvas ainda calçadas, você manipula o avental com as mãos contaminadas e espalha a contaminação. As luvas saem primeiro (p. 8–9).'),
        no('Retirar a touca', 'Você toca a touca com as luvas contaminadas e leva a contaminação para a cabeça e o rosto. As luvas saem primeiro (p. 8–9).'),
      ],
    }),
    cena({
      passo: 'Higienizar as mãos após retirar as luvas', fonte: 'p. 8–9',
      narrative: 'As luvas foram retiradas. Suas mãos estão sem luvas, mas você ainda usa avental, óculos, touca e máscara.',
      prompt: 'O que vem agora?',
      choices: [
        ok('Higienizar as mãos', 'Depois das luvas, as mãos são higienizadas antes de seguir (p. 8–9).'),
        no('Retirar o avental sem higienizar as mãos', 'Sem higienizar as mãos depois das luvas, você leva ao avental e ao próprio corpo o que ficou nelas. A sequência manda higienizar antes (p. 8–9).'),
        no('Retirar os óculos ou o face shield', 'Você toca os óculos com as mãos ainda contaminadas e leva a contaminação para os olhos. Primeiro higienize as mãos (p. 8–9).'),
        no('Retirar a máscara PFF2/N95', 'Você toca a máscara com as mãos ainda contaminadas, perto da boca e do nariz. Primeiro higienize as mãos (p. 8–9).'),
      ],
    }),
    cena({
      passo: 'Retirar o avental', fonte: 'p. 8–9',
      narrative: 'Suas mãos estão higienizadas. O avental ainda cobre seu corpo; óculos, touca e máscara continuam no lugar.',
      prompt: 'Qual é o próximo EPI?',
      choices: [
        ok('Retirar o avental', 'O avental sai depois das luvas e da higienização das mãos (p. 8–9).'),
        no('Retirar a máscara PFF2/N95', 'O avental ainda cobre seu corpo; a máscara é uma das últimas peças a sair (p. 8–9). Tirar a máscara antes expõe você sem necessidade.'),
        no('Retirar os óculos ou o face shield', 'O avental vem antes dos óculos na sequência (p. 8–9).'),
        no('Retirar a touca', 'O avental vem antes da touca na sequência (p. 8–9).'),
      ],
    }),
    cena({
      passo: 'Higienizar as mãos após retirar o avental', fonte: 'p. 8–9',
      narrative: 'O avental foi retirado. Você ainda usa óculos, touca e máscara.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos', 'Depois do avental, as mãos são higienizadas outra vez (p. 8–9).'),
        no('Retirar os óculos ou o face shield sem higienizar as mãos', 'Suas mãos tocaram o avental contaminado; você leva essa contaminação para os olhos. A sequência manda higienizar antes (p. 8–9).'),
        no('Retirar a touca sem higienizar as mãos', 'Suas mãos contaminadas tocam a touca e a cabeça. A sequência manda higienizar antes (p. 8–9).'),
        no('Retirar a máscara PFF2/N95 sem higienizar as mãos', 'Suas mãos contaminadas tocam a máscara, perto da boca e do nariz. A sequência manda higienizar antes (p. 8–9).'),
      ],
    }),
    cena({
      passo: 'Retirar os óculos ou o face shield', fonte: 'p. 9',
      narrative: 'Suas mãos estão higienizadas. Você ainda usa óculos, touca e máscara PFF2/N95.',
      prompt: 'Qual é o próximo EPI?',
      choices: [
        ok('Retirar os óculos ou o face shield', 'Na sequência com touca, os óculos saem antes da touca e da máscara (p. 9).'),
        no('Retirar a touca', 'Na sequência com touca, os óculos saem antes da touca (p. 9).'),
        no('Retirar a máscara PFF2/N95', 'A máscara é retirada depois dos óculos e da touca (p. 9).'),
        no('Higienizar as mãos mais uma vez e sair', 'Ainda faltam EPIs a retirar; a higienização final vem no fim da sequência (p. 9).'),
      ],
    }),
    cena({
      passo: 'Retirar a touca', fonte: 'p. 9',
      narrative: 'Os óculos foram retirados. Você ainda usa touca e máscara PFF2/N95.',
      prompt: 'Qual é o próximo EPI?',
      choices: [
        ok('Retirar a touca', 'Na sequência com touca, a touca sai antes da máscara (p. 9).'),
        no('Retirar a máscara PFF2/N95', 'Na sequência com touca, a touca sai antes da máscara (p. 9).'),
        no('Higienizar as mãos e sair com a touca', 'A touca faz parte dos EPIs a retirar antes da higienização final (p. 9).'),
        no('Calçar novas luvas para retirar a touca', 'Não há esse passo na sequência da desparamentação (p. 9).'),
      ],
    }),
    cena({
      passo: 'Retirar a máscara PFF2/N95', fonte: 'p. 9',
      narrative: 'A touca foi retirada. Você ainda usa a máscara PFF2/N95.',
      prompt: 'O que você faz?',
      choices: [
        ok('Retirar a máscara PFF2/N95', 'A máscara é o último EPI a sair, antes da higienização final (p. 9).'),
        no('Higienizar as mãos e manter a máscara até chegar à sala dos professores', 'A máscara faz parte dos EPIs a retirar na desparamentação, antes da higienização final (p. 9).'),
        no('Retirar a máscara cirúrgica', 'Você está usando a máscara PFF2/N95, não uma máscara cirúrgica.'),
        no('Retirar o propé', 'Você não está usando propé; ele não é recomendado rotineiramente (p. 8).'),
      ],
    }),
    cena({
      passo: 'Higienização final das mãos', fonte: 'p. 9',
      narrative: 'Todos os EPIs foram retirados.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos (higienização final)', 'A sequência termina com a higienização final das mãos (p. 9).'),
        no('Sair sem higienizar as mãos, pois já higienizou duas vezes', 'A higienização final faz parte da sequência (p. 9), mesmo depois das anteriores.'),
        no('Higienizar as mãos somente se estiverem visivelmente sujas', 'Na desparamentação, a higienização final faz parte da sequência (p. 9); ela não depende de sujidade visível.'),
        no('Calçar luvas novas antes de sair da área, para tocar nas superfícies', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5); a sequência termina com a higienização final das mãos (p. 9).'),
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// SINAIS VITAIS
// ---------------------------------------------------------------------------

const R5 = {
  code: 'R5', theme: TEMAS.sinaisVitais, title: 'Sinais vitais em paciente consciente: os valores dependem da sua técnica', fonte: `${SV}, p. 1–6`,
  setting: 'Consultório da UBS. Sobre a mesa: bandeja com estetoscópio, esfigmomanômetro, termômetro, relógio, bloco de anotações e caneta, todos já higienizados. O Sr. A.P. está sentado ao lado da mesa.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na UBS e vai avaliar os sinais vitais do Sr. A.P., 60 anos, antes da consulta. Ele está consciente e colaborativo. O material já foi preparado; você ainda não iniciou a abordagem.',
  task: 'Avalie temperatura, pulso, respiração e pressão arterial na ordem correta e comunique os achados. Os valores só aparecem no painel quando a técnica está correta. Nesta estação você não precisa classificar os resultados.',
  tip: 'A técnica de avaliação dos sinais vitais é a mesma independente do estado de consciência do paciente (p. 1). Ao final, informe os achados ao paciente e pergunte se ele tem alguma dúvida (p. 6).',
  scenes: [
    cena({
      passo: 'Higienizar as mãos antes de iniciar a avaliação', fonte: 'p. 1',
      narrative: 'O Sr. A.P. aguarda sentado. Você está diante da mesa, com o material pronto.',
      prompt: 'Qual é o seu primeiro passo?',
      choices: [
        ok('Higienizar as mãos', 'A prática começa com a lavagem das mãos (p. 1).'),
        no('Começar pela pressão arterial para adiantar a consulta', 'Antes de qualquer avaliação, você higieniza as mãos e aborda o paciente (p. 1).'),
        no('Calçar as luvas de procedimento', 'Antes de qualquer EPI ou material, vem a higienização das mãos (p. 1).'),
        no('Chamar o paciente à mesa e iniciar a medida sem se apresentar', 'O discente higieniza as mãos, se apresenta, explica o procedimento e pede o consentimento (p. 1).'),
      ],
    }),
    cena({
      passo: 'Apresentar-se, explicar o procedimento e pedir o consentimento', fonte: 'p. 1',
      narrative: 'Suas mãos estão higienizadas. O paciente olha para o esfigmomanômetro e para o relógio sobre a mesa.',
      patient: 'Sr. A.P.: "Bom dia, doutor(a). Vai demorar? Estou meio nervoso."',
      prompt: 'Como você começa?',
      choices: [
        ok('Apresentar-se, explicar o procedimento e pedir o consentimento', 'Ele relaxa os ombros e concorda. O discente se apresenta, explica o procedimento e pede o consentimento do paciente (p. 1).'),
        no('Começar a aferição sem explicar nada, para ganhar tempo', 'O paciente se assusta e se retrai, o que atrapalha as medidas. É preciso explicar o procedimento e pedir o consentimento (p. 1).'),
        no('Explicar o procedimento, mas começar sem pedir o consentimento', 'O roteiro pede apresentar-se, explicar o procedimento E pedir o consentimento (p. 1).'),
        no('Apresentar-se e pedir que ele fique em silêncio durante toda a avaliação', 'Falta explicar o procedimento e pedir o consentimento do paciente (p. 1).'),
      ],
    }),
    cena({
      passo: 'Avaliar a temperatura corporal', fonte: 'p. 2',
      narrative: 'O paciente consentiu. Você vai começar pela temperatura corporal.',
      prompt: 'Como você avalia a temperatura?',
      choices: [
        ok('Aferir com um termômetro digital simples', 'A temperatura é avaliada com termômetro digital simples ou infravermelho (p. 2). O termômetro marca 36,7 °C.'),
        ok('Aferir com um termômetro infravermelho', 'A temperatura é avaliada com termômetro digital simples ou infravermelho (p. 2). O termômetro marca 36,7 °C.'),
        no('Estimar a temperatura pelo toque na testa do paciente', 'A temperatura deve ser avaliada com termômetro digital simples ou infravermelho (p. 2); o toque não é um método de aferição.'),
        no('Pular a temperatura, pois o paciente não parece febril', 'A avaliação dos sinais vitais inclui a temperatura corporal (p. 2), independentemente da aparência do paciente.'),
      ],
      reveals: [{ label: 'Temperatura corporal', value: '36,7 °C' }],
    }),
    cena({
      passo: 'Avaliar o pulso: frequência e ritmo', fonte: 'p. 2',
      narrative: 'Você posiciona o antebraço do paciente apoiado sobre a mesa. Nos primeiros 30 segundos de palpação do pulso radial, o ritmo e a amplitude se mantêm sem alteração.',
      prompt: 'Como você obtém a frequência do pulso?',
      choices: [
        ok('Contar as pulsações por 1 minuto', 'O pulso é avaliado em 1 minuto: você obtém a frequência, o ritmo e a força (p. 2). O pulso radial está em 76 bpm e rítmico.'),
        ok('Contar por 30 segundos e multiplicar o valor por 2', 'Sem alteração de ritmo ou amplitude nos primeiros 30 segundos, pode-se multiplicar o valor por 2 (p. 2). O pulso radial está em 76 bpm e rítmico.'),
        no('Contar as pulsações por apenas 15 segundos e multiplicar por 4', 'O roteiro prevê 1 minuto, ou 30 segundos multiplicado por 2 quando não há alteração (p. 2); 15 segundos não está previsto.'),
        no('Medir só a frequência, sem observar o ritmo', 'No pulso devem ser avaliados a frequência e o ritmo (p. 2).'),
      ],
      reveals: [{ label: 'Pulso radial', value: '76 bpm, rítmico' }],
    }),
    cena({
      passo: 'Avaliar a respiração sem informar o paciente', fonte: 'p. 2–3',
      narrative: 'Você continua com os dedos no pulso e passa a observar, discretamente, o tórax do paciente. Alguns segundos se passam em silêncio.',
      patient: 'Sr. A.P.: "Está demorando um pouquinho, doutor(a). Está tudo bem?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Tranquilizá-lo, sem dizer que está contando a respiração, e continuar a avaliação por 1 minuto', 'O observador não deve informar ao paciente sobre a coleta, para que não ocorra controle voluntário do padrão respiratório (p. 2). A frequência respiratória é 16 irpm.'),
        no('Dizer que está contando a respiração e pedir que ele respire normalmente', 'Ao saber, o paciente passa a controlar a respiração e o padrão deixa de ser espontâneo (p. 2). Você precisaria recomeçar.'),
        no('Soltar o pulso e contar a respiração por 15 segundos, multiplicando por 4', 'A respiração é avaliada em um intervalo de 1 minuto, continuando a palpar o pulso (p. 2–3).'),
        no('Pedir que ele respire fundo para facilitar a contagem', 'Pedir que respire de determinado modo altera o padrão espontâneo; o paciente não deve ser informado (p. 2).'),
      ],
      reveals: [{ label: 'Frequência respiratória', value: '16 irpm' }],
    }),
    cena({
      passo: 'Aferir a pressão arterial pelo método indireto', fonte: 'p. 3–5',
      narrative: 'O paciente já está sentado e confortável.',
      prompt: 'Como você afere a pressão arterial?',
      choices: [
        ok('Garantir repouso de 3 a 5 minutos e medir pelo método indireto, estimando antes a sistólica pelo método palpatório', 'Repouso de 3 a 5 minutos, palpatório para estimar a sistólica e depois a ausculta (p. 3–4). Você registra: 124/78 mmHg.'),
        no('Medir de imediato, sem repouso', 'O repouso mínimo de 3 a 5 minutos, em local tranquilo, vem antes da medida (p. 3).'),
        no('Auscultar direto, sem estimar a sistólica pelo método palpatório', 'O método palpatório evita subestimar a sistólica quando há hiato auscultatório (p. 3–5).'),
        no('Medir com o braço do paciente pendente ao lado do corpo', 'A artéria braquial deve ficar ao nível do coração (4º espaço intercostal), com o braço apoiado (p. 3).'),
      ],
      reveals: [{ label: 'Pressão arterial', value: '124/78 mmHg' }],
    }),
    cena({
      passo: 'Informar os achados ao paciente e perguntar se há dúvida', fonte: 'p. 6',
      narrative: 'Você anotou todos os valores. O paciente espera, com o braço ainda apoiado na mesa.',
      patient: 'Sr. A.P.: "E aí, doutor(a)? Como ficaram os meus números?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Informar os achados ao paciente e perguntar se ele tem alguma dúvida', 'Ao final da avaliação, informa-se os achados ao paciente e pergunta-se se ele tem alguma dúvida (p. 6).'),
        no('Dizer que o médico informará depois e dispensá-lo', 'Ao final da avaliação dos sinais vitais, o discente informa os achados ao paciente (p. 6).'),
        no('Informar os valores, mas encerrar sem perguntar se ele tem dúvida', 'Além de informar os achados, o discente pergunta se o paciente tem alguma dúvida (p. 6).'),
        no('Entregar o papel com os valores sem explicar', 'O roteiro pede informar os achados ao paciente e perguntar se há dúvida (p. 6); entregar o papel não cumpre isso.'),
      ],
    }),
  ],
};

// Hiato auscultatório (Imagem 1, p. 5): o erro de pular o método palpatório tem consequência
// numérica. Os valores são fictícios e coerentes entre as cenas; nenhum é classificado.
const R6 = {
  code: 'R6', theme: TEMAS.sinaisVitais, title: 'Pressão arterial e o hiato auscultatório', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório da UBS, silencioso. A Sra. L.A. está sentada em uma cadeira com apoio para o braço. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial da Sra. L.A., 49 anos, que veio a uma consulta de rotina. Ela já foi abordada, entendeu o procedimento e consentiu. Acabou de chegar à sala.',
  task: 'Realize a medida da pressão arterial pelo método indireto, do repouso ao registro dos valores. Cada passo errado mostra o efeito sobre a medida. Nesta estação você não precisa classificar o resultado.',
  tip: 'O método palpatório estima a sistólica antes da ausculta e evita subestimá-la quando há hiato auscultatório, o intervalo em que os sons desaparecem (Imagem 1, p. 5).',
  scenes: [
    cena({
      passo: 'Repouso de 3 a 5 minutos, em local tranquilo', fonte: 'p. 3',
      narrative: 'A Sra. L.A. acabou de entrar, ofegante da escada. O material está pronto sobre a mesa.',
      patient: 'Sra. L.A.: "Doutor(a), estou atrasada. Pode medir logo a minha pressão?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Pedir que ela se sente confortavelmente e aguardar o repouso de 3 a 5 minutos, em local tranquilo', 'A medida exige repouso mínimo de 3 a 5 minutos, em local tranquilo e sem ruídos que atrapalhem a ausculta (p. 3).'),
        no('Medir imediatamente, já que ela está com pressa', 'Sem o repouso de 3 a 5 minutos, a medida não reflete a pressão de repouso (p. 3).'),
        no('Aguardar apenas 30 segundos e medir', 'O repouso deve ser de 3 a 5 minutos (p. 3).'),
        no('Aguardar o repouso na sala movimentada do posto de enfermagem', 'O local deve ser tranquilo e, preferencialmente, sem ruídos que interfiram na ausculta (p. 3).'),
      ],
    }),
    cena({
      passo: 'Posição do paciente e nível do braço', fonte: 'p. 3',
      narrative: 'Passaram-se 5 minutos de repouso. A paciente está sentada. O braço direito dela está sobre o colo.',
      prompt: 'Como você posiciona o braço?',
      choices: [
        ok('Manter a artéria braquial ao nível do coração (4º espaço intercostal), com o braço ligeiramente fletido e apoiado em superfície firme, palma da mão para cima', 'A artéria braquial ao nível do coração, o braço fletido e apoiado, a palma para cima: é o posicionamento correto (p. 3).'),
        no('Deixar o braço pendente ao lado do corpo', 'Com o braço abaixo do nível do coração, a medida sai alterada. A artéria braquial deve ficar ao nível do coração, no 4º espaço intercostal (p. 3).'),
        no('Deixar o braço apoiado sobre o colo, abaixo do nível do coração', 'O apoio no colo deixa o braço abaixo do nível do coração; a artéria braquial deve ficar no 4º espaço intercostal (p. 3).'),
        no('Deixar o braço esticado para frente, sem apoio', 'O braço deve ficar ligeiramente fletido e apoiado sobre uma superfície firme (p. 3).'),
      ],
    }),
    cena({
      passo: 'Localizar a artéria braquial e colocar o manguito 2 cm acima da fossa cubital', fonte: 'p. 3',
      narrative: 'O braço está bem posicionado. O manguito do esfigmomanômetro está aberto sobre a mesa.',
      prompt: 'Como você coloca o manguito?',
      choices: [
        ok('Localizar as pulsações da artéria braquial e colocar o manguito 2 cm acima da fossa cubital', 'Você localiza a braquial e posiciona o manguito 2 cm acima da fossa cubital (p. 3).'),
        no('Colocar o manguito sobre a fossa cubital', 'O manguito fica 2 cm acima da fossa cubital (p. 3).'),
        no('Colocar o manguito 2 cm abaixo da fossa cubital', 'O manguito deve ficar 2 cm ACIMA da fossa cubital (p. 3).'),
        no('Colocar o manguito sem localizar a pulsação da artéria braquial', 'As pulsações da artéria braquial devem ser localizadas antes (p. 3).'),
      ],
    }),
    cena({
      passo: 'Método palpatório: estimar a pressão sistólica', fonte: 'p. 3–5',
      narrative: 'O manguito está colocado.',
      prompt: 'Qual é o próximo passo?',
      choices: [
        ok('Palpar o pulso radial, insuflar o manguito até o pulso desaparecer e desinsuflar lentamente até ele reaparecer', 'O pulso radial desaparece com o manguito insuflado e reaparece em 168 mmHg: essa é a pressão sistólica pelo método palpatório (p. 3–4).'),
        no('Dispensar o método palpatório e insuflar direto até 150 mmHg', 'Você insufla até 150 mmHg e começa a desinsuflar. Os primeiros ruídos só aparecem em 132 mmHg, e você registraria 132 como sistólica. Mas os sons tinham sumido entre cerca de 150 e 132 mmHg (hiato auscultatório, Imagem 1, p. 5): a sistólica real é bem maior e você a subestimou. Sem o método palpatório você não sabe até onde insuflar (p. 3–4).'),
        no('Insuflar até um valor fixo qualquer, sem palpar o pulso', 'Sem estimar a sistólica antes, você não sabe até onde insuflar: pode ficar abaixo dela e perder os primeiros ruídos, ou insuflar além do necessário (p. 3–4).'),
        no('Palpar o pulso carotídeo para estimar a sistólica', 'No método palpatório usa-se o pulso radial (pode ser também a artéria braquial) (p. 3), e não a carótida.'),
      ],
      reveals: [{ label: 'Sistólica (método palpatório)', value: '168 mmHg' }],
    }),
    cena({
      passo: 'Insuflar cerca de 30 mmHg acima da sistólica palpatória', fonte: 'p. 4',
      narrative: 'O pulso radial reapareceu em 168 mmHg.',
      prompt: 'Como você prossegue?',
      choices: [
        ok('Colocar o estetoscópio sobre a artéria braquial e insuflar o manguito cerca de 30 mmHg acima do valor palpatório (≈ 198 mmHg)', 'Estetoscópio sobre a braquial e insuflação cerca de 30 mmHg acima da sistólica palpatória: você parte de ≈ 198 mmHg (p. 4).'),
        no('Colocar o estetoscópio sobre a artéria braquial e insuflar só até 150 mmHg, para poupar a paciente', 'Você fica abaixo da sistólica real (168 mmHg) e dentro do hiato: perderia o primeiro ruído e subestimaria a pressão. A insuflação vai cerca de 30 mmHg acima do valor palpatório (p. 4).'),
        no('Colocar o estetoscópio sobre a artéria braquial e insuflar apenas 10 mmHg acima do valor palpatório', 'A margem é de cerca de 30 mmHg acima do valor encontrado pelo método palpatório (p. 4).'),
        no('Colocar o estetoscópio sobre a artéria radial e insuflar cerca de 30 mmHg acima do valor palpatório', 'Na ausculta, o estetoscópio vai sobre a artéria braquial (p. 4); a radial é usada no método palpatório.'),
      ],
    }),
    cena({
      passo: 'Soltar o ar de maneira contínua, a 2–3 mmHg por segundo', fonte: 'p. 4',
      narrative: 'O manguito está insuflado a ≈ 198 mmHg, com o estetoscópio sobre a braquial. ',
      prompt: 'Como você solta o ar?',
      choices: [
        ok('Soltar o ar de maneira contínua, a 2–3 mmHg por segundo', 'A velocidade de 2–3 mmHg por segundo permite acompanhar cada fase dos ruídos (p. 4).'),
        no('Soltar o ar rapidamente, até esvaziar o manguito', 'Os ruídos passam em instantes e você não consegue marcar nem a fase I nem a fase V. O ar é solto de maneira contínua, a 2–3 mmHg por segundo (p. 4).'),
        no('Soltar o ar a 10 mmHg por segundo', 'Muito rápido para acompanhar os ruídos: o ritmo é de 2–3 mmHg por segundo (p. 4).'),
        no('Baixar a cabeça para auscultar melhor enquanto solta o ar', 'O observador deve evitar baixar a cabeça: a congestão dos vasos do ouvido prejudica a ausculta (p. 3).'),
      ],
    }),
    cena({
      passo: 'Registrar a sistólica na fase I e a diastólica na fase V de Korotkoff', fonte: 'p. 4–5',
      narrative: 'Você ouve o primeiro ruído em 168 mmHg. Os sons desaparecem em 150, reaparecem em 132 e, por fim, desaparecem em 96 mmHg.',
      prompt: 'Que valores você registra?',
      choices: [
        ok('Sistólica no primeiro ruído (168 mmHg, fase I) e diastólica no desaparecimento dos sons (96 mmHg, fase V)', 'A sistólica é o aparecimento do primeiro ruído (fase I) e a diastólica o desaparecimento dos sons (fase V) (p. 4). O silêncio entre 150 e 132 mmHg é o hiato auscultatório (p. 5). Registro: 168/96 mmHg.'),
        no('Sistólica em 132 mmHg, onde os ruídos reaparecem', 'Você subestimaria a sistólica: o primeiro ruído foi em 168 mmHg, e o intervalo de silêncio é o hiato auscultatório (Imagem 1, p. 5). Por isso o palpatório vem antes.'),
        no('Sistólica em 150 mmHg, onde os sons desaparecem', 'O primeiro ruído, que marca a sistólica (fase I), foi em 168 mmHg (p. 4).'),
        no('Diastólica no abafamento dos sons (fase IV de Korotkoff)', 'A diastólica é o desaparecimento dos sons, fase V, e não o abafamento (p. 4).'),
      ],
      reveals: [{ label: 'Pressão arterial', value: '168/96 mmHg' }],
    }),
  ],
};

const R7 = {
  code: 'R7', theme: TEMAS.sinaisVitais, title: 'Pressão arterial em gestante', fonte: `${SV}, p. 3–6`,
  setting: 'Consultório de pré-natal da UBS. Maca com apoio para o braço e travesseiros. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial da Sra. C.B., 28 anos, gestante, em consulta de pré-natal. Você ainda não se apresentou.',
  task: 'Realize a medida da pressão arterial pelo método indireto, na posição preferencial para gestantes, e comunique o resultado. Os valores só aparecem quando a técnica está correta. Nesta estação você não precisa classificar o resultado.',
  tip: 'Para gestantes, preferir o decúbito lateral esquerdo ou o decúbito dorsal (p. 3). A artéria braquial fica ao nível do coração, no 4º espaço intercostal, em qualquer posição (p. 3).',
  scenes: [
    cena({
      passo: 'Apresentar-se, explicar o procedimento e pedir o consentimento', fonte: 'p. 1',
      narrative: 'A paciente entra na sala e se acomoda na beira da maca, olhando o relógio.',
      patient: 'Sra. C.B.: "Isso vai demorar? Estou com a agenda cheia."',
      prompt: 'Como você começa?',
      choices: [
        ok('Apresentar-se, explicar o procedimento e pedir o consentimento', 'Ela relaxa ao entender o que será feito. O discente se apresenta, explica o procedimento e pede o consentimento (p. 1).'),
        no('Iniciar a medida sem explicar, para ganhar tempo', 'A paciente se surpreende e se retrai. É preciso explicar o procedimento e pedir o consentimento (p. 1).'),
        no('Explicar o procedimento e começar sem pedir o consentimento', 'O roteiro pede apresentar-se, explicar o procedimento E pedir o consentimento (p. 1).'),
        no('Pedir que ela espere em silêncio, sem dar explicações', 'Falta apresentar-se, explicar o procedimento e pedir o consentimento (p. 1).'),
      ],
    }),
    cena({
      passo: 'Repouso de 3 a 5 minutos, em local tranquilo', fonte: 'p. 3',
      narrative: 'A paciente consentiu.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Garantir repouso mínimo de 3 a 5 minutos, em local tranquilo', 'O repouso mínimo de 3 a 5 minutos, em local tranquilo, vem antes da medida (p. 3).'),
        no('Aferir assim que ela se deita, sem repouso', 'Sem o repouso, a medida não reflete a pressão de repouso (p. 3).'),
        no('Aguardar 1 minuto e medir', 'O repouso deve ser de 3 a 5 minutos (p. 3).'),
        no('Medir durante a conversa sobre o pré-natal', 'O local deve ser tranquilo, preferencialmente sem ruídos que interfiram na ausculta (p. 3).'),
      ],
    }),
    cena({
      passo: 'Posição da gestante e nível do braço', fonte: 'p. 3',
      narrative: 'O repouso foi cumprido. Agora você posiciona a paciente na maca.',
      prompt: 'Como você posiciona a gestante?',
      choices: [
        ok('Decúbito lateral esquerdo, com a artéria braquial ao nível do coração e o braço apoiado', 'No caso de gestantes, preferir o decúbito lateral esquerdo ou o decúbito dorsal (p. 3), com a artéria braquial ao nível do coração.'),
        ok('Decúbito dorsal, com a artéria braquial ao nível do coração e o braço apoiado', 'No caso de gestantes, preferir o decúbito lateral esquerdo ou o decúbito dorsal (p. 3), com a artéria braquial ao nível do coração.'),
        no('Decúbito lateral esquerdo, com o braço pendente abaixo do nível do coração', 'A posição do corpo está adequada, mas a artéria braquial precisa ficar ao nível do coração (4º espaço intercostal), com o braço apoiado (p. 3).'),
        no('Decúbito dorsal, com o braço sem apoio abaixo do nível do coração', 'A posição do corpo está adequada, mas a artéria braquial precisa ficar ao nível do coração (4º espaço intercostal), com o braço apoiado (p. 3).'),
      ],
    }),
    cena({
      passo: 'Localizar a artéria braquial e colocar o manguito 2 cm acima da fossa cubital', fonte: 'p. 3',
      narrative: 'A gestante está bem posicionada. O manguito está sobre a mesa.',
      prompt: 'Como você coloca o manguito?',
      choices: [
        ok('Localizar as pulsações da artéria braquial e colocar o manguito 2 cm acima da fossa cubital', 'Você localiza a braquial e posiciona o manguito 2 cm acima da fossa cubital (p. 3).'),
        no('Colocar o manguito sobre a fossa cubital', 'O manguito fica 2 cm acima da fossa cubital (p. 3).'),
        no('Colocar o manguito sem localizar a pulsação da artéria braquial', 'As pulsações da artéria braquial devem ser localizadas antes (p. 3).'),
        no('Colocar o manguito 2 cm abaixo da fossa cubital', 'O manguito deve ficar 2 cm ACIMA da fossa cubital (p. 3).'),
      ],
    }),
    cena({
      passo: 'Método palpatório: estimar a pressão sistólica', fonte: 'p. 3–4',
      narrative: 'O manguito está colocado.',
      prompt: 'Qual é o próximo passo?',
      choices: [
        ok('Palpar o pulso radial, insuflar o manguito até o pulso desaparecer e desinsuflar lentamente até ele reaparecer', 'O pulso radial reaparece em 128 mmHg: essa é a pressão sistólica pelo método palpatório (p. 3–4).'),
        no('Pular o método palpatório e auscultar direto', 'Sem o palpatório, você não sabe até onde insuflar, e pode subestimar a sistólica se houver hiato auscultatório (p. 3–5).'),
        no('Palpar o pulso carotídeo para estimar a sistólica', 'No método palpatório usa-se o pulso radial (pode ser também a artéria braquial) (p. 3), e não a carótida.'),
        no('Insuflar até 300 mmHg, para garantir', 'Sem estimativa palpatória você não sabe até onde insuflar; o roteiro manda insuflar cerca de 30 mmHg acima do valor palpatório (p. 4).'),
      ],
      reveals: [{ label: 'Sistólica (método palpatório)', value: '128 mmHg' }],
    }),
    cena({
      passo: 'Estetoscópio sobre a braquial, insuflar 30 mmHg acima e soltar o ar de modo contínuo', fonte: 'p. 4',
      narrative: 'O pulso radial reapareceu em 128 mmHg.',
      prompt: 'Como você prossegue?',
      choices: [
        ok('Colocar o estetoscópio sobre a artéria braquial, insuflar cerca de 30 mmHg acima do valor palpatório (≈ 158 mmHg) e soltar o ar de maneira contínua, a 2–3 mmHg por segundo', 'Ausculta sobre a braquial, insuflação cerca de 30 mmHg acima do valor palpatório e soltura contínua, a 2–3 mmHg por segundo (p. 4).'),
        no('Colocar o estetoscópio sobre a artéria braquial, insuflar cerca de 30 mmHg acima do valor palpatório e soltar o ar rapidamente', 'Soltando o ar rapidamente, os ruídos passam em instantes e você perde as fases I e V. O ar sai de forma contínua, a 2–3 mmHg por segundo (p. 4).'),
        no('Colocar o estetoscópio sobre a artéria braquial, insuflar apenas 10 mmHg acima do valor palpatório e soltar o ar de maneira contínua', 'A margem de insuflação é de cerca de 30 mmHg acima do valor palpatório (p. 4).'),
        no('Colocar o estetoscópio sobre a artéria radial, insuflar cerca de 30 mmHg acima do valor palpatório e soltar o ar de maneira contínua', 'Na ausculta, o estetoscópio vai sobre a artéria braquial (p. 4).'),
      ],
    }),
    cena({
      passo: 'Registrar a sistólica na fase I e a diastólica na fase V', fonte: 'p. 4',
      narrative: 'Você ouve o primeiro ruído em 128 mmHg. Os sons abafam em 80 mmHg e desaparecem em 74 mmHg.',
      prompt: 'Que valores você registra?',
      choices: [
        ok('Sistólica no primeiro ruído (128 mmHg, fase I) e diastólica no desaparecimento dos sons (74 mmHg, fase V)', 'A sistólica é o aparecimento do primeiro ruído (fase I) e a diastólica o desaparecimento dos sons (fase V) (p. 4). Registro: 128/74 mmHg.'),
        no('Diastólica no abafamento dos sons (80 mmHg, fase IV)', 'A diastólica é o desaparecimento dos sons, fase V (p. 4).'),
        no('Sistólica no desaparecimento dos sons', 'A sistólica é o aparecimento do primeiro ruído (fase I); o desaparecimento dos sons marca a diastólica (p. 4).'),
        no('Registrar só a sistólica, pois a diastólica depende da posição da gestante', 'Os dois valores são registrados: sistólica na fase I e diastólica na fase V (p. 4).'),
      ],
      reveals: [{ label: 'Pressão arterial', value: '128/74 mmHg' }],
    }),
    cena({
      passo: 'Informar os achados à paciente e perguntar se há dúvida', fonte: 'p. 6',
      narrative: 'Você anotou os valores. A paciente espera, ainda deitada.',
      patient: 'Sra. C.B.: "E aí, doutor(a), como está a minha pressão?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Informar os valores aferidos e perguntar se ela tem alguma dúvida', 'Ao final da avaliação, informa-se os achados à paciente e pergunta-se se ela tem alguma dúvida (p. 6).'),
        no('Dizer que o resultado será explicado só na próxima consulta', 'Ao final da avaliação, o discente informa os achados à paciente (p. 6).'),
        no('Informar os valores e encerrar sem perguntar se ela tem dúvida', 'Além de informar os achados, o discente pergunta se a paciente tem alguma dúvida (p. 6).'),
        no('Entregar o papel com os valores sem explicar', 'O roteiro pede informar os achados e perguntar se há dúvida (p. 6); entregar o papel não cumpre isso.'),
      ],
    }),
  ],
};

// Paciente inconsciente: o roteiro (p. 1) diz que a técnica é a mesma. O pulso é verificado na
// artéria CARÓTIDA (instrução do usuário; o roteiro a lista entre as principais, p. 2, mas não diz
// qual usar no inconsciente — passo derivado). A jugular é veia: entra como distrator.
const R8 = {
  code: 'R8', theme: TEMAS.sinaisVitais, title: 'Sinais vitais em paciente inconsciente', fonte: `${SV}, p. 1–6`,
  setting: 'Sala de observação do pronto atendimento. O paciente está em uma maca, com acesso livre aos dois braços e ao pescoço. Sobre a bancada: bandeja, estetoscópio, esfigmomanômetro, termômetro, relógio, bloco de anotações, caneta, luvas de procedimento, álcool 70% e algodão.',
  scenario: 'Você é acadêmico(a) de Medicina em estágio no pronto atendimento. Um paciente adulto foi acomodado na maca da sala de observação, inconsciente, sem acompanhante e sem informações prévias. A equipe médica já o avaliou e pediu que você afira os sinais vitais enquanto aguarda os exames. Você ainda não iniciou nenhum preparo.',
  task: 'Realize a avaliação dos sinais vitais deste paciente na ordem correta. Os valores só aparecem quando a técnica está correta. Nesta estação você não precisa classificar os achados nem conduzir o caso.',
  tip: 'A técnica de avaliação dos sinais vitais é a mesma, independente do estado de consciência do paciente (p. 1). Principais artérias para avaliação do pulso: radial, carotídea e femoral (p. 2).',
  scenes: [
    cena({
      passo: 'Higienizar as mãos e preparar o material', fonte: 'p. 1',
      narrative: 'O paciente está imóvel na maca, respirando. Sobre a bancada estão os materiais; nada foi higienizado ainda.',
      patient: 'Enfermeira: "Pode começar. Os sinais vitais dele são para agora."',
      prompt: 'Qual é o seu primeiro passo?',
      choices: [
        ok('Higienizar as mãos e higienizar o material da bandeja com algodão embebido em álcool 70%', 'A prática começa com a lavagem das mãos e todo o material é higienizado com algodão embebido em álcool 70% (p. 1).'),
        no('Começar a aferir já, pois o paciente é prioridade', 'A técnica é a mesma independente do estado do paciente: higienizar as mãos e o material vem antes (p. 1).'),
        no('Higienizar o material com água e sabão', 'Todo o material é higienizado com algodão embebido em álcool 70% (p. 1).'),
        no('Calçar as luvas de procedimento e dispensar a higienização das mãos', 'A higienização das mãos vem antes de iniciar a avaliação (p. 1).'),
      ],
    }),
    cena({
      passo: 'Apresentar-se, explicar o procedimento e pedir o consentimento', fonte: 'p. 1', origem: 'D',
      narrative: 'O material está pronto. O paciente continua sem responder.',
      patient: 'Enfermeira: "Ele está inconsciente, não precisa explicar nada, né?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Apresentar-se, explicar o procedimento e pedir o consentimento, mesmo com o paciente inconsciente', 'A avaliação dos sinais vitais deve seguir a mesma técnica independente do estado de consciência do paciente, incluindo apresentar-se, explicar o procedimento e pedir o consentimento (p. 1).'),
        no('Dispensar a apresentação e a explicação porque o paciente está inconsciente', 'A técnica é a mesma independente do estado de consciência do paciente (p. 1).'),
        no('Usar uma técnica simplificada porque o paciente está inconsciente', 'A avaliação dos sinais vitais segue a mesma técnica independente do estado de consciência (p. 1).'),
        no('Pedir à enfermeira que autorize no lugar do paciente e começar', 'O roteiro pede que o próprio discente se apresente, explique o procedimento e peça o consentimento (p. 1).'),
      ],
    }),
    cena({
      passo: 'Avaliar a temperatura corporal', fonte: 'p. 2',
      narrative: 'Você se apresentou e explicou o que será feito. Vai avaliar a temperatura.',
      prompt: 'Como você avalia a temperatura?',
      choices: [
        ok('Aferir com um termômetro digital simples', 'A temperatura é avaliada com termômetro digital simples ou infravermelho (p. 2). O termômetro marca 36,4 °C.'),
        ok('Aferir com um termômetro infravermelho', 'A temperatura é avaliada com termômetro digital simples ou infravermelho (p. 2). O termômetro marca 36,4 °C.'),
        no('Estimar a temperatura pelo toque na testa', 'A temperatura deve ser avaliada com termômetro digital simples ou infravermelho (p. 2).'),
        no('Pular a temperatura, pois o paciente está inconsciente', 'Todos os sinais vitais são avaliados com a mesma técnica, independente do estado de consciência (p. 1).'),
      ],
      reveals: [{ label: 'Temperatura corporal', value: '36,4 °C' }],
    }),
    cena({
      passo: 'Avaliar o pulso na artéria carótida', fonte: 'p. 2', origem: 'D',
      narrative: 'O pescoço do paciente está livre. Você vai avaliar o pulso.',
      prompt: 'Onde você verifica o pulso?',
      choices: [
        ok('Palpar o pulso na artéria carótida, avaliando frequência, ritmo e força', 'As principais artérias para avaliação do pulso são radial, carotídea e femoral (p. 2); no paciente inconsciente, você verifica a pulsação na carótida. O pulso está em 82 bpm e rítmico.'),
        no('Palpar o pulso na veia jugular', 'O pulso é palpado em artérias — radial, carotídea e femoral (p. 2). A jugular é uma veia: ela não é sítio de pulso.'),
        no('Dispensar a avaliação do pulso e seguir para a pressão arterial', 'A avaliação dos sinais vitais inclui o pulso, com a mesma técnica independente do estado de consciência (p. 1–2).'),
        no('Contar o pulso por apenas 15 segundos e multiplicar por 4', 'O pulso é avaliado em 1 minuto (ou 30 segundos multiplicado por 2, se não houver alteração de ritmo ou amplitude) (p. 2).'),
      ],
      reveals: [{ label: 'Pulso carotídeo', value: '82 bpm, rítmico' }],
    }),
    cena({
      passo: 'Avaliar a respiração', fonte: 'p. 2–3',
      narrative: 'Você mantém os dedos no pulso. O tórax do paciente sobe e desce lentamente.',
      prompt: 'Como você avalia a respiração?',
      choices: [
        ok('Continuar palpando o pulso, observar discretamente o tórax e contar a respiração durante 1 minuto', 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo, em um intervalo de 1 minuto (p. 2–3). A frequência respiratória é 14 irpm.'),
        no('Não avaliar a respiração, pois o paciente está inconsciente', 'Todos os sinais vitais são avaliados com a mesma técnica, independente do estado de consciência (p. 1).'),
        no('Soltar o pulso e contar a respiração por 15 segundos, multiplicando por 4', 'A respiração é avaliada em um intervalo de 1 minuto, continuando a palpar o pulso (p. 2–3).'),
        no('Avaliar a respiração antes de palpar o pulso', 'A respiração é avaliada logo após o pulso, mantendo a palpação do mesmo (p. 3).'),
      ],
      reveals: [{ label: 'Frequência respiratória', value: '14 irpm' }],
    }),
    cena({
      passo: 'Aferir a pressão arterial pelo método indireto', fonte: 'p. 3–5',
      narrative: 'O paciente está deitado, com os braços ao longo do corpo.',
      patient: 'Enfermeira: "Dá para medir o braço direito, está livre."',
      prompt: 'Como você afere a pressão arterial?',
      choices: [
        ok('Manter a artéria braquial ao nível do coração, com o braço apoiado, e medir pelo método indireto, estimando antes a sistólica pelo método palpatório', 'Repouso, artéria braquial ao nível do coração com o braço apoiado, palpatório e depois ausculta (p. 3–4). Você registra: 112/70 mmHg.'),
        no('Deixar o braço pendente para fora da maca e medir', 'Com o braço abaixo do nível do coração, a medida sai alterada. A artéria braquial deve ficar ao nível do coração, com o braço apoiado (p. 3).'),
        no('Dispensar a pressão arterial, pois o paciente está inconsciente', 'Todos os sinais vitais são avaliados com a mesma técnica, independente do estado de consciência (p. 1).'),
        no('Auscultar direto, sem o método palpatório', 'O método palpatório evita subestimar a sistólica quando há hiato auscultatório (p. 3–5).'),
      ],
      reveals: [{ label: 'Pressão arterial', value: '112/70 mmHg' }],
    }),
    cena({
      passo: 'Informar os achados e perguntar se há dúvida', fonte: 'p. 6', origem: 'D',
      narrative: 'Você anotou todos os valores. A enfermeira se aproxima da maca.',
      patient: 'Enfermeira: "E aí, já tem os valores?"',
      prompt: 'O que você faz?',
      choices: [
        ok('Informar os achados e perguntar se há alguma dúvida', 'Ao final da avaliação dos sinais vitais, informam-se os achados e pergunta-se se há dúvida (p. 6).'),
        no('Registrar os valores sem informar ninguém', 'Ao final da avaliação, o discente informa os achados (p. 6).'),
        no('Informar os valores e encerrar sem perguntar se há dúvida', 'Além de informar os achados, pergunta-se se há dúvida (p. 6).'),
        no('Dizer que o médico verá o prontuário depois e sair', 'O discente informa os achados ao final da avaliação (p. 6).'),
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// LACUNAS FECHADAS NA REVISÃO 4: 5 momentos, precaução padrão, higiene das mãos e luvas
// ---------------------------------------------------------------------------

const R9 = {
  code: 'R9', theme: TEMAS.biosseguranca, title: 'Os 5 momentos da higiene das mãos', fonte: `${BIO}, p. 2 e 5`,
  setting: 'Quarto de enfermaria, leito 3. Dispensador de preparação alcoólica ao lado da cama; mesa de cabeceira com os objetos do paciente; bandeja com o material do procedimento.',
  scenario: 'Você é acadêmico(a) de Medicina e fará o atendimento do Sr. P.S., 49 anos: o exame, um procedimento limpo/asséptico com risco de exposição a fluidos corporais e, ao final, o cuidado com o leito. Suas mãos estão limpas, mas você ainda não tocou no paciente.',
  task: 'Decida, a cada situação, o que fazer com as suas mãos, nos cinco momentos da higiene das mãos. Nesta estação você não precisa realizar o exame nem o procedimento.',
  tip: 'Os 5 momentos: antes de tocar o paciente; antes de procedimento limpo/asséptico; após risco de exposição a fluidos corporais; após tocar o paciente; após tocar superfícies próximas ao paciente (p. 2).',
  scenes: [
    cena({
      passo: 'Momento 1: higienizar as mãos antes de tocar o paciente', fonte: 'p. 2 e 5',
      narrative: 'Você chega ao leito 3. O Sr. P.S. está deitado e estende o braço para você.',
      patient: 'Sr. P.S.: "Pode me examinar, doutor(a)."',
      prompt: 'O que você faz com as suas mãos antes de tocá-lo?',
      choices: [
        ok('Higienizar as mãos antes de tocar o paciente', 'Momento 1 (p. 2): antes de tocar o paciente. Você higieniza as mãos diante dele e só então o examina.'),
        no('Calçar luvas de procedimento e tocar o paciente', 'As luvas não substituem a higienização das mãos, feita antes e após o contato com qualquer paciente (p. 5).'),
        no('Examinar o paciente e higienizar as mãos só depois', 'A primeira higienização vem ANTES de tocar o paciente (momento 1, p. 2); sem ela, o que está nas suas mãos vai para ele.'),
        no('Dispensar a higienização, pois as mãos parecem limpas', 'A higienização antes de tocar o paciente é um dos cinco momentos (p. 2); ela não depende de as mãos parecerem sujas.'),
      ],
    }),
    cena({
      passo: 'Momento 2: higienizar as mãos antes do procedimento limpo/asséptico', fonte: 'p. 2',
      narrative: 'O exame terminou. Agora você vai realizar um procedimento limpo/asséptico. Entre o exame e o procedimento, você tocou o paciente.',
      prompt: 'Antes de começar o procedimento, o que você faz?',
      choices: [
        ok('Higienizar as mãos antes de realizar o procedimento limpo/asséptico', 'Momento 2 (p. 2): mesmo tendo higienizado antes do exame, você higieniza de novo antes do procedimento.'),
        no('Seguir direto para o procedimento, pois já higienizou as mãos antes do exame', 'Entre o exame e o procedimento você tocou o paciente: antes do procedimento limpo/asséptico há um momento próprio de higienização (p. 2).'),
        no('Higienizar as mãos só depois do procedimento', 'O momento 2 é ANTES do procedimento limpo/asséptico (p. 2).'),
        no('Calçar luvas para substituir a higienização das mãos', 'As luvas não substituem a higienização das mãos (p. 5).'),
      ],
    }),
    cena({
      passo: 'Momento 3: higienizar as mãos após risco de exposição a fluidos corporais', fonte: 'p. 2 e 5',
      narrative: 'O procedimento terminou. Houve risco de exposição a fluidos corporais do paciente.',
      patient: 'Sr. P.S.: "Acho que respingou um pouquinho, doutor(a)."',
      prompt: 'O que você faz com as mãos agora?',
      choices: [
        ok('Higienizar as mãos após o risco de exposição a fluidos corporais', 'Momento 3 (p. 2): após risco de exposição a fluidos corporais; a higienização também é feita após o contato com sangue ou secreções (p. 5).'),
        no('Ajeitar o paciente no leito e higienizar as mãos depois', 'Depois do risco de exposição a fluidos corporais, você higieniza as mãos antes de tocar de novo o paciente ou o ambiente (p. 2).'),
        no('Higienizar as mãos somente se houver sangue visível', 'O momento 3 vale após o RISCO de exposição, não apenas quando há sangue visível (p. 2).'),
        no('Anotar no prontuário e higienizar as mãos ao final do plantão', 'A higienização é feita no momento do risco de exposição (p. 2), e não ao final do plantão.'),
      ],
    }),
    cena({
      passo: 'Momento 4: higienizar as mãos após tocar o paciente', fonte: 'p. 2 e 5',
      narrative: 'Você ajeita o travesseiro e cobre o paciente antes de sair.',
      prompt: 'Depois de tocar o paciente, o que você faz?',
      choices: [
        ok('Higienizar as mãos após tocar o paciente', 'Momento 4 (p. 2): após tocar o paciente; a higienização é feita antes e após o contato com qualquer paciente (p. 5).'),
        no('Seguir sem higienizar, pois já higienizou há pouco', 'Após tocar o paciente há um momento próprio de higienização (momento 4, p. 2).'),
        no('Higienizar as mãos só se o paciente tiver alguma infecção', 'A precaução padrão vale para todos os pacientes, independentemente de diagnóstico (p. 5 e 7): a higienização não depende de suspeita de infecção.'),
        no('Calçar luvas para mexer na mesa de cabeceira', 'As luvas são para risco de contato com sangue, secreções ou membranas mucosas (p. 5) e não substituem a higienização das mãos.'),
      ],
    }),
    cena({
      passo: 'Momento 5: higienizar as mãos após tocar superfícies próximas ao paciente', fonte: 'p. 2',
      narrative: 'Sobre a mesa de cabeceira estão o copo, o controle remoto e os óculos do paciente. Você os reorganiza.',
      patient: 'Sr. P.S.: "Pode deixar aí, doutor(a). É só a mesinha, não precisa lavar a mão por causa dela."',
      prompt: 'Depois de tocar a mesa de cabeceira, o que você faz?',
      choices: [
        ok('Higienizar as mãos após tocar superfícies próximas ao paciente', 'Momento 5 (p. 2): após tocar superfícies próximas ao paciente, mesmo sem ter tocado nele.'),
        no('Concordar com o paciente: a mesa não é o paciente, então não precisa higienizar', 'Tocar superfícies próximas ao paciente também exige higienização (momento 5, p. 2).'),
        no('Higienizar as mãos só se a mesa estiver visivelmente suja', 'O momento 5 não depende de sujidade visível (p. 2).'),
        no('Higienizar apenas as pontas dos dedos', 'A higienização cobre todas as superfícies das mãos (p. 3–4).'),
      ],
    }),
  ],
};

const R10 = {
  code: 'R10', theme: TEMAS.biosseguranca, title: 'Precaução padrão: injeção e descarte da agulha', fonte: `${BIO}, p. 5 e 7`,
  setting: 'Quarto de enfermaria. Sobre a mesa auxiliar: bandeja com seringa e agulha já preparadas, caixa de luvas de procedimento e dispensador de preparação alcoólica. Uma caixa coletora de perfurocortantes está presa à parede, ao lado do leito.',
  scenario: 'Você é acadêmico(a) de Medicina e vai administrar uma medicação injetável ao Sr. L.M., 55 anos, internado para acompanhamento. Durante o procedimento há risco de contato com sangue, mas não há risco de respingos. A precaução padrão vale para todos os pacientes. Você ainda não tocou no paciente.',
  task: 'Conduza a sequência da precaução padrão, da higiene das mãos antes do contato ao descarte da seringa e da agulha e à higiene final. Nesta estação você não precisa detalhar a técnica da injeção.',
  tip: 'Precaução padrão (p. 5 e 7): higiene das mãos, luvas e avental, óculos e máscara quando há risco de respingos, e descarte adequado de perfurocortantes. Vale para TODOS os pacientes.',
  scenes: [
    cena({
      passo: 'Higienizar as mãos antes do contato com o paciente', fonte: 'p. 5',
      narrative: 'Você está ao lado do leito do Sr. L.M., com a medicação preparada na bandeja. Há risco de contato com sangue durante a injeção, mas não de respingos.',
      patient: 'Sr. L.M.: "Pode aplicar quando quiser, doutor(a)."',
      prompt: 'O que você faz primeiro?',
      choices: [
        ok('Higienizar as mãos', 'A higienização das mãos é feita antes e após o contato com qualquer paciente (p. 5).'),
        no('Calçar as luvas de procedimento sem higienizar as mãos', 'A higienização vem antes: ela é feita antes e após o contato com qualquer paciente (p. 5), e as luvas não a substituem.'),
        no('Colocar avental, máscara e óculos', 'Óculos, máscara e/ou avental são usados quando há risco de contato de sangue ou secreções com a mucosa, a roupa e as superfícies corporais (p. 5); aqui não há risco de respingos.'),
        no('Aplicar a injeção e higienizar as mãos só depois', 'Antes do contato com o paciente as mãos já devem estar higienizadas (p. 5).'),
      ],
    }),
    cena({
      passo: 'Calçar as luvas imediatamente antes do contato', fonte: 'p. 5',
      narrative: 'Suas mãos estão higienizadas. A caixa de luvas de procedimento está aberta ao lado.',
      prompt: 'E agora?',
      choices: [
        ok('Calçar as luvas de procedimento imediatamente antes do contato com o paciente', 'Há risco de contato com sangue: as luvas são calçadas imediatamente antes do contato com o paciente (p. 5).'),
        no('Calçar as luvas agora e usá-las também para anotar no prontuário', 'As luvas são calçadas imediatamente antes do contato e retiradas logo após o uso (p. 5).'),
        no('Dispensar as luvas, pois o procedimento é rápido', 'Luvas são indicadas quando há risco de contato com sangue, secreções ou membranas mucosas (p. 5); o caso informa esse risco.'),
        no('Calçar as luvas cirúrgicas (estéreis)', 'O caso não informa técnica estéril: o EPI é a luva de procedimento (p. 9–10).'),
      ],
    }),
    cena({
      passo: 'Descartar a seringa e a agulha sem desconectar nem reencapar', fonte: 'p. 5 e 7',
      narrative: 'A injeção foi aplicada. Você está com a seringa e a agulha usadas na mão, ainda de luvas. A caixa de perfurocortantes está na parede, a um passo de você.',
      patient: 'Colega: "Reencapa essa agulha antes de levar até a caixa, é mais seguro."',
      prompt: 'O que você faz com a seringa e a agulha?',
      choices: [
        ok('Descartar a seringa e a agulha na caixa de perfurocortantes, sem desconectá-las e sem reencapá-las', 'Descarte, em recipientes apropriados, seringas e agulhas, sem desconectá-las ou reencapá-las (p. 5).'),
        no('Reencapar a agulha, como o colega sugeriu', 'Seringas e agulhas são descartadas sem reencapá-las (p. 5): ao reencapar, sua mão fica perto da ponta da agulha e o risco de acidente com perfurocortante aumenta.'),
        no('Desconectar a agulha da seringa para descartar cada uma em um recipiente', 'Seringas e agulhas são descartadas sem desconectá-las (p. 5).'),
        no('Deixar sobre a bandeja para descartar depois', 'O descarte adequado de perfurocortantes faz parte da precaução padrão (p. 5 e 7); deixar a agulha exposta mantém o risco de acidente para você e para a equipe.'),
        no('Descartar no lixo comum', 'O descarte é em recipientes apropriados, a caixa de perfurocortantes (p. 5 e 7).'),
      ],
    }),
    cena({
      passo: 'Retirar as luvas logo após o uso', fonte: 'p. 5',
      narrative: 'A seringa e a agulha foram descartadas. Você ainda está de luvas, ao lado do leito.',
      prompt: 'O que você faz com as luvas?',
      choices: [
        ok('Retirar as luvas logo após o uso', 'As luvas são retiradas logo após o uso (p. 5).'),
        no('Manter as luvas para atender o próximo paciente', 'As luvas são retiradas logo após o uso, higienizando as mãos em seguida (p. 5).'),
        no('Usar as luvas para anotar no prontuário e retirá-las só depois', 'As luvas são retiradas logo após o uso (p. 5); o prontuário e outras superfícies não fazem parte do procedimento.'),
        no('Retirar as luvas e guardá-las no bolso para reutilizar', 'As luvas são descartadas em lixo infectante após o uso (p. 10).'),
      ],
    }),
    cena({
      passo: 'Higienizar as mãos em seguida', fonte: 'p. 5',
      narrative: 'As luvas foram retiradas e descartadas.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos em seguida', 'Após a remoção das luvas, as mãos são higienizadas em seguida (p. 5).'),
        no('Sair do quarto sem higienizar as mãos, pois usou luvas durante todo o procedimento', 'As luvas não dispensam a higienização: ela é feita após a remoção das luvas (p. 5).'),
        no('Higienizar as mãos só se houver sangue visível nas luvas', 'A higienização após a remoção das luvas faz parte da precaução padrão (p. 5), com ou sem sujidade visível.'),
        no('Higienizar as mãos somente ao final do plantão', 'A higienização é feita em seguida à remoção das luvas (p. 5).'),
      ],
    }),
  ],
};

const R11 = {
  code: 'R11', theme: TEMAS.biosseguranca, title: 'Higiene das mãos: qual técnica usar e como executá-la', fonte: `${BIO}, p. 3–5`,
  setting: 'Posto de enfermagem da enfermaria. Pia com torneira de acionamento manual, sabonete líquido e dispensador de papel-toalha. Dispensador de preparação alcoólica na parede.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na enfermaria. Ao longo do plantão você vai higienizar as mãos em duas situações diferentes e precisa escolher e executar a técnica correta em cada uma.',
  task: 'Em cada situação, escolha a técnica adequada e execute as etapas que mais costumam ser erradas. Nesta estação você não precisa atender os pacientes.',
  tip: 'Água e sabonete quando as mãos estiverem visivelmente sujas; fricção com preparação alcoólica (20 a 30 segundos) nas demais situações (p. 4–5).',
  scenes: [
    cena({
      passo: 'Mãos visivelmente sujas: higienizar com água e sabonete', fonte: 'p. 4–5',
      narrative: 'Você acabou de organizar caixas de material e percebe sujidade visível nas suas mãos. Ao lado da pia, na parede, está o dispensador de álcool.',
      patient: 'Colega: "Usa o álcool mesmo, é bem mais rápido."',
      prompt: 'Qual técnica você usa?',
      choices: [
        ok('Lavar as mãos com água e sabonete', 'Com as mãos visivelmente sujas, a higienização é com água e sabonete (p. 4); a fricção alcoólica é para mãos sem sujidade visível (p. 5).'),
        no('Friccionar as mãos com preparação alcoólica, como o colega sugeriu', 'Com sujidade visível o álcool não é a técnica indicada: lava-se com água e sabonete (p. 4–5).'),
        no('Calçar luvas por cima da sujeira', 'As luvas não substituem a higienização das mãos (p. 5).'),
        no('Passar um papel-toalha seco nas mãos', 'O papel-toalha seco não é uma técnica de higienização: lava-se com água e sabonete (p. 3).'),
      ],
    }),
    cena({
      passo: 'Aplicar sabão em quantidade suficiente para cobrir toda a palma', fonte: 'p. 3',
      narrative: 'Suas mãos estão molhadas. O sabonete líquido está à sua frente.',
      prompt: 'Quanto sabonete você aplica?',
      choices: [
        ok('Quantidade suficiente para cobrir toda a palma', 'O sabão é aplicado em quantidade suficiente para cobrir toda a palma (passo 1, p. 3).'),
        no('Uma gota, apenas nas pontas dos dedos', 'A quantidade deve ser suficiente para cobrir toda a palma (passo 1, p. 3): uma gota não alcança todas as superfícies das mãos.'),
        no('Nenhum sabão: só água, para economizar', 'A técnica é com água e sabonete (p. 3–4); só água não higieniza as mãos visivelmente sujas.'),
        no('Sabonete só na palma da mão dominante', 'O sabão deve cobrir toda a palma de ambas as mãos, e as etapas seguintes esfregam as duas (p. 3).'),
      ],
    }),
    cena({
      passo: 'Esfregar palmas, dorso, costas dos dedos, polegares e pontas dos dedos', fonte: 'p. 3',
      narrative: 'O sabonete cobre as palmas das mãos.',
      prompt: 'Qual é o próximo passo?',
      choices: [
        ok('Palma com palma, dorso de cada mão com os dedos entrelaçados, costas dos dedos, polegares e pontas dos dedos', 'A sequência passa por todas as superfícies: palmas, dorso com dedos entrelaçados, costas dos dedos, polegares e pontas dos dedos em movimento circular (passos 2 a 7, p. 3).'),
        no('Apenas as palmas das mãos', 'Só as palmas deixam sem higienizar o dorso, os espaços entre os dedos, os polegares e as pontas dos dedos (passos 2 a 7, p. 3).'),
        no('Apenas as pontas dos dedos', 'As pontas dos dedos são só uma das etapas; a sequência inclui palmas, dorso, dedos e polegares (p. 3).'),
        no('Só o dorso das mãos, já que as palmas ficam limpas', 'As palmas fazem parte da sequência e são a primeira etapa (p. 3).'),
      ],
    }),
    cena({
      passo: 'Enxaguar, secar e usar o papel-toalha para fechar a torneira', fonte: 'p. 3',
      narrative: 'As mãos foram esfregadas.',
      prompt: 'Como você termina?',
      choices: [
        ok('Enxaguar com água, secar bem as mãos e usar o papel-toalha para fechar a torneira', 'Enxágue, secagem completa e torneira fechada com o papel-toalha: assim as mãos limpas não tocam de novo a superfície contaminada (passos 8 a 10, p. 3).'),
        no('Enxaguar, secar e fechar a torneira com a mão', 'O roteiro orienta usar o papel-toalha para fechar a torneira (passo 10, p. 3): com a mão, você recontamina o que acabou de higienizar.'),
        no('Fechar a torneira com a mão limpa e secar depois', 'A torneira é fechada com o papel-toalha, depois de secar as mãos (passos 9 e 10, p. 3).'),
        no('Friccionar as mãos até secarem, sem enxaguar', 'Este é o final da fricção alcoólica (p. 4); na lavagem, as mãos são enxaguadas com água e secas (p. 3).'),
      ],
    }),
    cena({
      passo: 'Fricção alcoólica: quantidade suficiente em uma mão em forma de concha', fonte: 'p. 4–5',
      narrative: 'Mais tarde você vai examinar uma paciente. Suas mãos não estão visivelmente sujas e há preparação alcoólica ao lado do leito.',
      prompt: 'Como você aplica a preparação alcoólica?',
      choices: [
        ok('Aplicar quantidade suficiente em uma mão em forma de concha, para cobrir todas as superfícies das mãos', 'A quantidade deve ser suficiente para cobrir todas as superfícies das mãos (passo 1a/1b, p. 4).'),
        no('Aplicar uma gota apenas na palma', 'A quantidade deve cobrir todas as superfícies das mãos (p. 4): uma gota não alcança o dorso nem os dedos.'),
        no('Aplicar a preparação alcoólica só nas pontas dos dedos', 'A preparação cobre todas as superfícies das mãos (p. 4).'),
        no('Aplicar e enxaguar logo em seguida', 'O enxágue faz parte da lavagem com água e sabonete (p. 3), e não da fricção alcoólica (p. 4).'),
      ],
    }),
    cena({
      passo: 'Friccionar por 20 a 30 segundos, até as mãos secarem', fonte: 'p. 4',
      narrative: 'A preparação alcoólica está nas suas mãos. A paciente espera no leito.',
      prompt: 'Como você conduz a fricção?',
      choices: [
        ok('Friccionar todas as superfícies por 20 a 30 segundos, até as mãos secarem', 'A duração de todo o procedimento é de 20 a 30 segundos; quando as mãos estiverem secas, estarão seguras (p. 4).'),
        no('Friccionar por 5 segundos e tocar na paciente', 'A duração de todo o procedimento é de 20 a 30 segundos (p. 4); com 5 segundos, as mãos não ficaram seguras.'),
        no('Secar as mãos com papel-toalha', 'Na fricção alcoólica as mãos secam sozinhas: "quando estiverem secas, suas mãos estarão seguras" (p. 4).'),
        no('Enxaguar as mãos depois de friccionar', 'O enxágue faz parte da lavagem com água e sabonete (p. 3), e não da fricção alcoólica (p. 4).'),
      ],
    }),
  ],
};

const R12 = {
  code: 'R12', theme: TEMAS.biosseguranca, title: 'Luvas de procedimento: calçar e retirar', fonte: `${BIO}, p. 5 e 9–10`,
  setting: 'Beira do leito, na enfermaria. Caixa de luvas de procedimento sobre a mesa auxiliar e recipiente para lixo infectante ao lado da cama. Dispensador de preparação alcoólica na parede.',
  scenario: 'Você é acadêmico(a) de Medicina e fará, no paciente S.T., 45 anos, um procedimento de assistência não estéril, com risco de contato com secreções. Você usa um relógio e uma pulseira no punho e acaba de higienizar as mãos.',
  task: 'Calce as luvas de procedimento e, ao final do procedimento, retire-as, descarte-as e finalize a técnica. Nesta estação você não precisa realizar o procedimento no paciente.',
  tip: 'Calce as luvas imediatamente antes do contato com o paciente e retire-as logo após o uso, higienizando as mãos em seguida (p. 5).',
  scenes: [
    cena({
      passo: 'Remover joias e outros artefatos das mãos e pulsos', fonte: 'p. 9',
      narrative: 'Você abre a caixa de luvas. O relógio e a pulseira ainda estão no seu punho.',
      prompt: 'O que você faz antes de calçar as luvas?',
      choices: [
        ok('Remover as joias e outros artefatos das mãos e dos pulsos', 'Antes de calçar as luvas, remova joias e outros artefatos das mãos e pulsos (p. 9).'),
        no('Calçar as luvas por cima do relógio e da pulseira', 'Joias e artefatos devem ser removidos antes (p. 9); sob a luva eles ficam fora do alcance da higienização e podem rasgá-la.'),
        no('Remover apenas a pulseira e manter o relógio', 'O roteiro pede remover joias e outros artefatos das mãos e pulsos (p. 9), o que inclui o relógio.'),
        no('Dispensar a remoção, pois as luvas são resistentes', 'A remoção de joias e artefatos das mãos e pulsos vem antes de calçar as luvas (p. 9).'),
      ],
    }),
    cena({
      passo: 'Calçar a luva cuidadosamente, ajustando-a até o pulso', fonte: 'p. 5 e 9',
      narrative: 'As joias foram removidas. O paciente já está no leito, à sua espera.',
      patient: 'Colega: "Pode calçar rápido, não precisa ajustar até o pulso."',
      prompt: 'Como você calça a luva?',
      choices: [
        ok('Calçar a luva cuidadosamente, ajustando-a até o pulso', 'Cuidadosamente, calce a luva ajustando-a até o pulso (p. 9).'),
        no('Calçar a luva rapidamente, sem ajustá-la até o pulso', 'A luva é calçada cuidadosamente, ajustada até o pulso (p. 9): sem ajuste, o punho fica exposto.'),
        no('Calçar as luvas cirúrgicas (estéreis)', 'O procedimento não é estéril: o EPI é a luva de procedimento (p. 9–10).'),
        no('Calçar a luva depois de tocar o paciente', 'Calce-as imediatamente antes do contato com o paciente (p. 5).'),
      ],
    }),
    cena({
      passo: 'Retirar a primeira luva segurando pela parte externa, na altura do punho', fonte: 'p. 10', origem: 'R',
      narrative: 'O procedimento terminou. Você está de luvas, ao lado do leito.',
      prompt: 'Como você retira a primeira luva?',
      choices: [
        ok('Segurar uma luva pela parte externa, na altura do punho, e puxá-la em direção à ponta dos dedos, de modo que saia do avesso', 'Segure uma luva pela parte externa, na altura do punho, e puxe em direção à ponta dos dedos: a luva sairá do avesso (p. 10).'),
        no('Puxar a luva pela ponta dos dedos', 'A luva é segurada pela parte externa, na altura do punho, e puxada em direção à ponta dos dedos (p. 10).'),
        no('Retirar as duas luvas ao mesmo tempo, puxando-as pelos dedos', 'A retirada é uma luva de cada vez, começando pela externa na altura do punho (p. 10).'),
        no('Esfregar uma luva na outra até soltarem', 'Não é a técnica prevista: segure pela parte externa, na altura do punho, e puxe em direção à ponta dos dedos (p. 10).'),
      ],
    }),
    cena({
      passo: 'Segurar a luva removida com a outra mão enluvada', fonte: 'p. 10',
      narrative: 'A primeira luva saiu do avesso e está na sua mão.',
      prompt: 'O que você faz com ela?',
      choices: [
        ok('Segurar a luva removida com a outra mão ainda enluvada', 'Segure a luva removida com a outra mão enluvada (p. 10).'),
        no('Largar a luva sobre a cama enquanto retira a segunda', 'A luva removida fica na outra mão enluvada (p. 10); sobre a cama, ela contamina o leito.'),
        no('Segurá-la com a mão sem luva', 'A luva removida é segurada pela mão que ainda está enluvada (p. 10).'),
        no('Jogá-la no lixo comum antes de retirar a segunda', 'As luvas são descartadas em lixo infectante, ao final (p. 10).'),
      ],
    }),
    cena({
      passo: 'Colocar os dedos da mão sem luva por dentro da segunda luva', fonte: 'p. 10',
      narrative: 'Resta a segunda luva, na mão que segura a primeira.',
      prompt: 'Como você começa a retirar a segunda luva?',
      choices: [
        ok('Colocar os dedos da mão sem luva na parte interna da segunda luva, entre a luva e o punho', 'Coloque os dedos da mão não enluvada na parte interna da luva, entre a luva e o punho (p. 10).'),
        no('Segurar a segunda luva pela parte externa com a mão sem luva', 'A mão sem luva entra pela parte interna da segunda luva, entre a luva e o punho (p. 10); a parte externa está contaminada.'),
        no('Arrancar a segunda luva pelos dedos', 'A segunda luva é retirada pelo lado de dentro, a partir do punho (p. 10).'),
        no('Retirar a segunda luva tocando a parte externa com os dois polegares', 'A parte externa está contaminada; os dedos entram pela parte interna, entre a luva e o punho (p. 10).'),
      ],
    }),
    cena({
      passo: 'Remover a segunda luva, arrastando-a sobre a primeira', fonte: 'p. 10',
      narrative: 'Seus dedos estão por dentro da segunda luva, na altura do punho.',
      prompt: 'Como você remove a segunda luva?',
      choices: [
        ok('Remover a segunda luva, arrastando-a em direção à ponta dos dedos e da outra luva', 'Remova a segunda luva, arrastando-a em direção à ponta dos dedos e da outra luva (p. 10): a primeira fica dentro da segunda.'),
        no('Puxar a segunda luva pela parte externa, sem passar pela outra luva', 'A segunda luva sai pelo lado de dentro, arrastada em direção à ponta dos dedos e da outra luva (p. 10).'),
        no('Soltar a primeira luva e retirar a segunda separadamente', 'A primeira luva permanece segura pela mão enluvada e é envolvida pela segunda (p. 10).'),
        no('Rasgar a segunda luva para soltá-la', 'A segunda luva é arrastada para fora, e não rasgada (p. 10).'),
      ],
    }),
    cena({
      passo: 'Descartar as luvas em lixo infectante', fonte: 'p. 10',
      narrative: 'As duas luvas estão juntas na sua mão. O recipiente de lixo infectante está ao lado da cama; o lixo comum, perto da porta.',
      patient: 'Colega: "Pode jogar no lixo comum aqui perto, é mais rápido."',
      prompt: 'O que você faz com as luvas?',
      choices: [
        ok('Descartar as luvas em lixo infectante', 'Descarte as luvas em lixo infectante (p. 10).'),
        no('Descartar as luvas no lixo comum, como o colega sugeriu', 'As luvas são descartadas em lixo infectante (p. 10): no lixo comum, elas expõem outras pessoas.'),
        no('Guardar as luvas no bolso do jaleco para reutilizar', 'As luvas são descartadas após o uso, em lixo infectante (p. 10).'),
        no('Deixar as luvas sobre a mesa auxiliar', 'As luvas são descartadas em lixo infectante (p. 10).'),
      ],
    }),
    cena({
      passo: 'Higienizar as mãos', fonte: 'p. 5 e 10',
      narrative: 'As luvas foram descartadas. Suas mãos estão sem luvas.',
      prompt: 'O que você faz agora?',
      choices: [
        ok('Higienizar as mãos', 'Descarte as luvas em lixo infectante e higienize as mãos (p. 10); a higienização é feita após a remoção das luvas (p. 5).'),
        no('Sair sem higienizar as mãos, pois usou luvas', 'As luvas não dispensam a higienização: ela é feita após a remoção das luvas (p. 5 e 10).'),
        no('Higienizar as mãos só se estiverem visivelmente sujas', 'A higienização após a remoção das luvas faz parte da técnica (p. 5 e 10), com ou sem sujidade visível.'),
        no('Calçar novas luvas para sair do quarto', 'Luvas só são indicadas quando há risco de contato com sangue, secreções ou mucosas (p. 5); a técnica termina com a higienização das mãos.'),
      ],
    }),
  ],
};

const R13 = {
  code: 'R13', theme: TEMAS.biosseguranca, title: 'Luvas cirúrgicas (estéreis): calçar', fonte: `${BIO}, p. 10`,
  setting: 'Sala de procedimentos do ambulatório. O pacote de luvas cirúrgicas estéreis está aberto sobre a mesa auxiliar. Ao lado, uma caixa de luvas de procedimento.',
  scenario: 'Você é acadêmico(a) de Medicina e vai auxiliar um procedimento que exige técnica estéril, em paciente do ambulatório. Você precisa calçar as luvas cirúrgicas antes de começar. Você ainda não tocou nas luvas.',
  task: 'Calce as luvas cirúrgicas, na sequência correta. Cada passo errado mostra o efeito sobre a técnica estéril. Nesta estação você não precisa realizar o procedimento.',
  tip: 'Luva cirúrgica: pegue uma luva com o polegar e o indicador; puxe-a na mão; deslize a mão parcialmente enluvada sob a borda da segunda luva; puxe-a pelo lado de dentro até o pulso; deslize os dedos sob a borda da primeira e ajuste-a (p. 10).',
  scenes: [
    cena({
      passo: 'Pegar uma luva com o polegar e o indicador', fonte: 'p. 10',
      narrative: 'O pacote está aberto: as duas luvas estão lado a lado sobre a embalagem. Você ainda não tocou nelas.',
      prompt: 'Como você pega a primeira luva?',
      choices: [
        ok('Pegar uma luva com o polegar e o indicador', 'A primeira luva é pega com o polegar e o indicador (passo 1, p. 10).'),
        no('Pegar as duas luvas ao mesmo tempo, com a palma da mão', 'A técnica é sequencial: uma luva com o polegar e o indicador, e a outra depois (passos 1 a 5, p. 10).'),
        no('Pegar a luva com a mão inteira, tocando também a parte de fora', 'A primeira luva é pega com o polegar e o indicador (passo 1, p. 10); a mão inteira toca mais superfície da luva.'),
        no('Calçar a luva sem tirá-la da embalagem', 'Pega-se a luva com o polegar e o indicador e puxa-se na mão (passos 1 e 2, p. 10).'),
      ],
    }),
    cena({
      passo: 'Puxar a luva na mão', fonte: 'p. 10',
      narrative: 'A primeira luva está entre o seu polegar e o indicador.',
      prompt: 'O que você faz com ela?',
      choices: [
        ok('Puxar a luva na mão', 'Você puxa a luva na mão (passo 2, p. 10).'),
        no('Calçar a luva com a outra mão, ainda sem luva, tocando a parte externa', 'A parte externa não deve ser tocada pela mão sem luva; a luva é puxada na mão (passo 2, p. 10).'),
        no('Deixar a luva pela metade e ajustá-la depois com a mão sem luva', 'A luva é puxada na mão (passo 2, p. 10) e o ajuste final é feito com a mão enluvada (passo 5).'),
        no('Trocar para a luva de procedimento, que é mais fácil de calçar', 'O procedimento exige técnica estéril: luva cirúrgica (p. 10).'),
      ],
    }),
    cena({
      passo: 'Deslizar a mão parcialmente enluvada sob a borda da segunda luva', fonte: 'p. 10',
      narrative: 'A primeira mão está parcialmente enluvada. A segunda luva continua sobre a embalagem.',
      prompt: 'Como você pega a segunda luva?',
      choices: [
        ok('Deslizar a mão parcialmente enluvada sob a borda da segunda luva', 'Deslize a mão parcialmente enluvada sob a borda da segunda luva (passo 3, p. 10).'),
        no('Pegar a segunda luva pela parte externa com a mão ainda sem luva', 'A mão sem luva não toca a parte externa: a segunda luva é pega pela borda, com a mão parcialmente enluvada (passo 3, p. 10).'),
        no('Pegar a segunda luva com a mão sem luva, pelo lado de dentro', 'A segunda luva é pega pela borda com a mão parcialmente enluvada (passo 3, p. 10).'),
        no('Calçar as duas luvas ao mesmo tempo', 'A técnica é sequencial: uma mão primeiro, depois a outra com a mão parcialmente enluvada (passos 1 a 5, p. 10).'),
      ],
    }),
    cena({
      passo: 'Puxar a outra luva pelo lado de dentro até o pulso', fonte: 'p. 10',
      narrative: 'Sua mão parcialmente enluvada está sob a borda da segunda luva.',
      prompt: 'Como você calça a segunda luva?',
      choices: [
        ok('Puxar a outra luva pelo lado de dentro e puxá-la até o pulso', 'Puxe a outra luva pelo lado de dentro e a leve até o pulso (passo 4, p. 10).'),
        no('Puxar a outra luva pela parte externa até o pulso', 'A luva é puxada pelo lado de dentro (passo 4, p. 10).'),
        no('Puxar a luva apenas até a metade da mão', 'A luva é puxada até o pulso (passo 4, p. 10).'),
        no('Ajustar a luva tocando a parte externa com a mão sem luva', 'O ajuste é feito com a mão enluvada, e a parte externa não é tocada pela mão sem luva (passos 4 e 5, p. 10).'),
      ],
    }),
    cena({
      passo: 'Deslizar os dedos sob a borda da primeira luva e puxá-la até o pulso', fonte: 'p. 10',
      narrative: 'A segunda luva está no pulso. A primeira ainda está parcialmente calçada.',
      prompt: 'O que falta?',
      choices: [
        ok('Deslizar os dedos da mão completamente enluvada sob a borda da primeira luva e puxá-la até o pulso', 'Deslize os dedos da mão completamente enluvada sob a borda da primeira luva e puxe-a até o pulso (passo 5, p. 10). Os dois punhos estão ajustados e a técnica está completa.'),
        no('Deixar a primeira luva como está, sem ajustá-la até o pulso', 'A primeira luva também é puxada até o pulso (passo 5, p. 10).'),
        no('Tocar a parte externa da primeira luva com a mão sem luva para ajustá-la', 'As duas mãos já estão enluvadas; o ajuste é feito deslizando os dedos sob a borda (passo 5, p. 10).'),
        no('Tirar a primeira luva e recolocá-la', 'Não há esse passo: a primeira luva é ajustada sob a borda e puxada até o pulso (passo 5, p. 10).'),
      ],
    }),
  ],
};

export const casos = [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, ...casosVariantes];
export default casos;
