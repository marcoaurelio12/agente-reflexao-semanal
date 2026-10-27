// Dados falsos para trabalhar sem backend. Formato EXATO de docs/ARQUITETURA.md §API.
// Mudar para false no checkpoint T+1:30, quando o backend estiver a correr.
const USAR_MOCK = true;

// ---------------------------------------------------------------------------
// GET /api/memoria — construído a partir de memoria/diario/2026-W41..W43.md
// `markdown` = corpo da entrada (sem o frontmatter).
// ---------------------------------------------------------------------------

const MD_W41 = `# Semana de 5 a 11 de outubro

## Resumo

Semana com uma entrega importante cumprida e um workshop que correu bem. Preparar a reunião na
véspera fez diferença. A análise de dados ficou para trás porque as manhãs foram ocupadas por
reuniões marcadas em cima da hora.

## Prioridades da semana passada

Primeira semana: ainda não havia prioridades.

## Correu bem

- Entreguei o primeiro relatório de diagnóstico ao cliente dentro do prazo.
- O workshop com a equipa do cliente correu bem e toda a gente participou.

## Aprendi

- Preparar a agenda da reunião na véspera fez o workshop render muito mais.

## Bloqueou

- Reuniões marcadas em cima da hora partiram-me as manhãs e não avancei na análise de dados.

## Energia: 4/5

Boa semana; o workshop deu-me energia.

## Prioridades para a semana seguinte

1. Terminar a análise de dados do cliente até quarta-feira.
2. Pedir ao Rui clareza sobre o âmbito do próximo sprint.
3. Bloquear duas manhãs de foco no calendário.

## Ajuste de hábito

Experimenta marcar no calendário, à segunda de manhã, dois blocos de foco de 2 horas, antes
que outras pessoas ocupem esse espaço.

## Padrões assinalados

Nenhum ainda (primeira semana).
`;

const MD_W42 = `# Semana de 12 a 18 de outubro

## Resumo

A análise ficou feita, com um dia de atraso causado por dados que chegaram tarde. A conversa
com o Rui deu clareza sobre o que é prioritário. As manhãs de foco resultaram: foram os dias
mais produtivos da semana.

## Prioridades da semana passada

- Terminar a análise de dados até quarta-feira: **em parte** (terminei na quinta, um dia depois).
- Pedir ao Rui clareza sobre o âmbito do sprint: **feito**.
- Bloquear duas manhãs de foco: **feito**.

## Correu bem

- Terminei a análise de dados.
- Tive uma conversa franca com o Rui sobre o âmbito; agora sei o que é prioritário.

## Aprendi

- Nas duas manhãs bloqueadas rendi o dobro do que nos outros dias.

## Bloqueou

- Os dados da outra equipa chegaram com dois dias de atraso.
- As notificações constantes do Teams interrompiam o trabalho.

## Energia: 3/5

Cansada a meio da semana, por estar à espera dos dados.

## Prioridades para a semana seguinte

1. Preparar a apresentação de resultados intermédios para quinta-feira.
2. Combinar com a equipa de dados uma data fixa para as próximas entregas.
3. Manter duas manhãs de foco por semana.

## Ajuste de hábito

Experimenta pôr o Teams em "não incomodar" durante os blocos de foco e ver as mensagens só no
fim de cada bloco.

## Padrões assinalados

Nenhum ainda (nada se repetiu duas vezes).
`;

const MD_W43 = `# Semana de 19 a 25 de outubro

## Resumo

A apresentação intermédia correu bem e teve feedback positivo. Pedir ajuda cedo poupou um dia
de trabalho. As reuniões voltaram a ocupar quase todo o tempo, a energia desceu e o sono
ressentiu-se antes da apresentação.

## Prioridades da semana passada

- Preparar a apresentação de resultados intermédios: **feito**.
- Combinar com a equipa de dados uma data fixa: **não avançou** (não houve tempo para marcar a conversa).
- Manter duas manhãs de foco: **em parte** (só consegui uma).

## Correu bem

- A apresentação intermédia foi bem recebida pelo cliente.
- O Rui deu-me feedback positivo sobre a forma como respondi às perguntas.

## Aprendi

- A única manhã de foco que consegui foi quando fiz a parte mais difícil da apresentação.
- Pedir ajuda cedo ao Tiago desbloqueou em 20 minutos um problema em que estava presa há um dia.

## Bloqueou

- Tive 14 reuniões esta semana e voltei a ficar sem tempo para trabalho de fundo.
- Dormi mal duas noites antes da apresentação.

## Energia: 2/5

Semana pesada; dormi mal antes da apresentação.

## Prioridades para a semana seguinte

1. Fechar o primeiro rascunho do documento de recomendações até sexta.
2. Pedir a agenda antes de aceitar reuniões novas e recusar as que não a têm.
3. Proteger duas manhãs de foco.

## Ajuste de hábito

Experimenta, quando recebes um convite sem agenda, responder "Qual é o objetivo desta
reunião?". Se não houver resposta clara, propõe resolver por mensagem.

## Padrões assinalados

- «Reuniões a mais ou sem agenda» aparece como bloqueio em 2 das últimas 3 semanas.
- «Blocos de foco» aparece como aprendizagem pela 2.ª semana seguida.
- «Blocos de foco» é prioridade há 3 semanas seguidas.
- A energia desceu de 4 para 2 nas últimas 3 semanas.
`;

const PADROES_W43 = [
  {
    tipo: "bloqueio_recorrente",
    tema: "reunioes-excessivas",
    semanas: ["2026-W41", "2026-W43"],
    mensagem: "«Reuniões a mais ou sem agenda» aparece como bloqueio em 2 das últimas 3 semanas.",
  },
  {
    tipo: "aprendizagem_a_consolidar",
    tema: "foco-manha",
    semanas: ["2026-W42", "2026-W43"],
    mensagem: "«Blocos de foco» aparece como aprendizagem pela 2.ª semana seguida.",
  },
  {
    tipo: "prioridade_que_transita",
    tema: "foco-manha",
    semanas: ["2026-W41", "2026-W42", "2026-W43"],
    mensagem: "«Blocos de foco» é prioridade há 3 semanas seguidas.",
  },
  {
    tipo: "energia_em_queda",
    tema: null,
    semanas: ["2026-W41", "2026-W42", "2026-W43"],
    mensagem: "A energia desceu de 4 para 2 nas últimas 3 semanas.",
  },
];

const MOCK_MEMORIA = {
  contexto: `# Inês: contexto

> PERSONA FICTÍCIA. Dados inventados para a demo; não corresponde a nenhuma pessoa real.

## Quem é

- Nome: Inês, 27 anos
- Papel: consultora júnior de tecnologia numa consultora em Lisboa
- Projeto atual: análise de dados para um cliente do setor segurador (nome omitido)
- Reporta a: Rui, gestor de projeto
- Colega de referência: Tiago, consultor sénior

## Objetivos deste trimestre

- Entregar ao cliente o documento de recomendações até meados de novembro
- Ganhar autonomia a apresentar resultados ao cliente
`,
  semanas: [
    {
      semana: "2026-W41",
      periodo: "2026-10-05 a 2026-10-11",
      energia: 4,
      resumo:
        "Semana com uma entrega importante cumprida e um workshop que correu bem. Preparar a reunião na véspera fez diferença. A análise de dados ficou para trás porque as manhãs foram ocupadas por reuniões marcadas em cima da hora.",
      prioridades: [
        "Terminar a análise de dados do cliente até quarta-feira.",
        "Pedir ao Rui clareza sobre o âmbito do próximo sprint.",
        "Bloquear duas manhãs de foco no calendário.",
      ],
      padroes: [],
      markdown: MD_W41,
    },
    {
      semana: "2026-W42",
      periodo: "2026-10-12 a 2026-10-18",
      energia: 3,
      resumo:
        "A análise ficou feita, com um dia de atraso causado por dados que chegaram tarde. A conversa com o Rui deu clareza sobre o que é prioritário. As manhãs de foco resultaram: foram os dias mais produtivos da semana.",
      prioridades: [
        "Preparar a apresentação de resultados intermédios para quinta-feira.",
        "Combinar com a equipa de dados uma data fixa para as próximas entregas.",
        "Manter duas manhãs de foco por semana.",
      ],
      padroes: [],
      markdown: MD_W42,
    },
    {
      semana: "2026-W43",
      periodo: "2026-10-19 a 2026-10-25",
      energia: 2,
      resumo:
        "A apresentação intermédia correu bem e teve feedback positivo. Pedir ajuda cedo poupou um dia de trabalho. As reuniões voltaram a ocupar quase todo o tempo, a energia desceu e o sono ressentiu-se antes da apresentação.",
      prioridades: [
        "Fechar o primeiro rascunho do documento de recomendações até sexta.",
        "Pedir a agenda antes de aceitar reuniões novas e recusar as que não a têm.",
        "Proteger duas manhãs de foco.",
      ],
      padroes: PADROES_W43,
      markdown: MD_W43,
    },
  ],
  padroes: PADROES_W43,
  metricas: {
    energia: [
      { semana: "2026-W41", valor: 4 },
      { semana: "2026-W42", valor: 3 },
      { semana: "2026-W43", valor: 2 },
    ],
    prioridades_cumpridas: { feitas: 3, parciais: 2, total: 6 },
  },
};

// ---------------------------------------------------------------------------
// POST /api/chat — conversa da W44 (ver pitch/ROTEIRO-DEMO.md).
// O índice é o número de mensagens do utilizador já enviadas.
// ---------------------------------------------------------------------------

const MOCK_CHAT = [
  // 0 — abertura (mensagens: [])
  {
    resposta:
      "Olá, Inês. Na semana passada escolheste três prioridades: fechar o primeiro rascunho do documento de recomendações, pedir a agenda antes de aceitar reuniões novas e proteger duas manhãs de foco. Como correram?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 1 — depois de "Normal." (resposta vaga → seguimento concreto)
  {
    resposta: "Qual das três avançou mais, e qual ficou mais para trás?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 2 — depois do ponto de situação das prioridades
  {
    resposta: "Fica registado. E o que correu bem esta semana?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 3 — depois do "correu bem"
  {
    resposta: "O que aprendeste esta semana, sobre o trabalho ou sobre a forma como trabalhas?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 4 — depois da aprendizagem
  {
    resposta:
      "Isso liga com o que notaste na semana de 5 de outubro, quando preparar a agenda na véspera fez o workshop render mais. O que te travou ou te fez perder mais tempo?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 5 — depois do bloqueio (o agente repara no padrão)
  {
    resposta:
      "As reuniões a mais também apareceram na semana de 5 e na de 19 de outubro: é a terceira vez em quatro semanas. O que achas que as faz voltar?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 6 — depois da causa
  {
    resposta:
      "Faz sentido olhar para isso. Como está a tua energia, de 1 a 5? E o que mais contribuiu para isso?",
    pronto_para_fechar: false,
    alerta_seguranca: false,
  },
  // 7 — depois da energia → fecho
  {
    resposta: "Subiu em relação à semana de 19 de outubro. Vou preparar o resumo da tua semana.",
    pronto_para_fechar: true,
    alerta_seguranca: false,
  },
];

// Para testar o estilo do alerta: escreve "estou em baixo há semanas e não vejo saída".
const MOCK_ALERTA = {
  resposta:
    "Obrigado por partilhares isto comigo. Parece-me um momento difícil, e isso merece mais do que uma reflexão de 5 minutos. Falar com alguém pode ajudar: uma pessoa de confiança, o teu médico de família ou a linha SNS 24 (808 24 24 24), que tem aconselhamento psicológico. Queres fazer uma pausa aqui, ou preferes continuar a reflexão?",
  pronto_para_fechar: false,
  alerta_seguranca: true,
};

const MOCK_FIM_CONVERSA = {
  resposta: "Já tenho tudo o que preciso. Carrega em \"Ver resumo da semana\".",
  pronto_para_fechar: true,
  alerta_seguranca: false,
};

// ---------------------------------------------------------------------------
// POST /api/fechar — semana 2026-W44, ainda por guardar.
// ---------------------------------------------------------------------------

const MOCK_FECHO = {
  semana: {
    semana: "2026-W44",
    periodo: "2026-10-26 a 2026-11-01",
    registado_em: "2026-10-30",
    energia: 3,
    energia_nota: "Melhor do que a semana passada, dormi melhor.",
    prioridades_anteriores: [
      {
        texto: "Fechar o primeiro rascunho do documento de recomendações até sexta.",
        estado: "feito",
        nota: "Ficou feito na quinta.",
      },
      {
        texto: "Pedir a agenda antes de aceitar reuniões novas e recusar as que não a têm.",
        estado: "nao-avancou",
        nota: "Esqueci-me.",
      },
      {
        texto: "Proteger duas manhãs de foco.",
        estado: "em-parte",
        nota: "Só consegui a de sexta.",
      },
    ],
    correu_bem: [
      "O workshop de quarta com o cliente correu bem: validaram quase todas as recomendações.",
      "Fechei o rascunho do documento na quinta.",
    ],
    aprendizagens: [
      {
        texto:
          "Levar o documento com as decisões já preparadas para o cliente escolher torna o workshop muito mais rápido.",
        tema: "preparar-reunioes",
      },
    ],
    bloqueios: [
      {
        texto:
          "Aceitei um \"alinhamento rápido\" sem agenda na quinta de manhã; durou uma hora e não decidimos nada.",
        tema: "reunioes-excessivas",
      },
    ],
    resumo:
      "O rascunho do documento ficou fechado e o workshop com o cliente validou quase todas as recomendações. Preparar as decisões antes do workshop voltou a fazer diferença. As reuniões sem agenda voltaram a ocupar uma manhã, e a dificuldade em dizer que não apareceu como possível causa. A energia subiu um pouco em relação à semana anterior.",
    prioridades: [
      {
        texto: "Enviar ao cliente a versão final do documento de recomendações até quarta-feira.",
        tema: "entregas",
      },
      {
        texto:
          "Antes de aceitar uma reunião nova, perguntar qual é o objetivo e propor resolver por mensagem quando não houver resposta.",
        tema: "dizer-nao",
      },
      {
        texto: "Marcar na segunda de manhã as duas manhãs de foco da semana.",
        tema: "foco-manha",
      },
    ],
    ajuste_habito:
      "Experimenta ter uma frase pronta para os convites sem agenda, por exemplo: \"Qual é o objetivo? Se for rápido, resolvemos por mensagem.\" Assim não tens de decidir na hora.",
    padroes: [
      {
        tipo: "bloqueio_recorrente",
        tema: "reunioes-excessivas",
        semanas: ["2026-W41", "2026-W43", "2026-W44"],
        mensagem: "«Reuniões a mais ou sem agenda» aparece como bloqueio em 3 das últimas 4 semanas.",
      },
      {
        tipo: "aprendizagem_a_consolidar",
        tema: "preparar-reunioes",
        semanas: ["2026-W41", "2026-W44"],
        mensagem: "«Preparar reuniões com antecedência» aparece como aprendizagem em 2 semanas.",
      },
      {
        tipo: "aprendizagem_a_consolidar",
        tema: "foco-manha",
        semanas: ["2026-W42", "2026-W43"],
        mensagem: "«Blocos de foco» aparece como aprendizagem em 2 semanas.",
      },
      {
        tipo: "prioridade_que_transita",
        tema: "foco-manha",
        semanas: ["2026-W41", "2026-W42", "2026-W43", "2026-W44"],
        mensagem: "«Blocos de foco» é prioridade há 4 semanas seguidas.",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// POST /api/resumo-mensal (P2)
// ---------------------------------------------------------------------------

const MOCK_RESUMO_MENSAL = {
  texto:
    "Em quatro semanas, as reuniões a mais apareceram três vezes como bloqueio e os blocos de foco foram prioridade em todas. Os blocos de foco também se confirmaram como aprendizagem: foram as manhãs mais produtivas. Preparar as reuniões com antecedência resultou duas vezes. A energia desceu de 4 para 2 e voltou a 3 na última semana.",
};

// ---------------------------------------------------------------------------
// mockFetch(url, body) — devolve DIRETAMENTE o objeto JSON (não um Response),
// com um atraso de ~600 ms para simular a rede e o LLM.
// ---------------------------------------------------------------------------

function _semanaParaMemoria(s) {
  const linhas = [
    `# Semana ${s.periodo}`,
    "",
    "## Resumo",
    "",
    s.resumo,
    "",
    "## Correu bem",
    "",
    ...s.correu_bem.map((t) => `- ${t}`),
    "",
    "## Aprendi",
    "",
    ...s.aprendizagens.map((a) => `- ${a.texto}`),
    "",
    "## Bloqueou",
    "",
    ...s.bloqueios.map((b) => `- ${b.texto}`),
    "",
    `## Energia: ${s.energia}/5`,
    "",
    s.energia_nota,
    "",
    "## Prioridades para a semana seguinte",
    "",
    ...s.prioridades.map((p, i) => `${i + 1}. ${p.texto}`),
    "",
    "## Ajuste de hábito",
    "",
    s.ajuste_habito,
    "",
    "## Padrões assinalados",
    "",
    ...s.padroes.map((p) => `- ${p.mensagem}`),
    "",
  ];
  return {
    semana: s.semana,
    periodo: s.periodo,
    energia: s.energia,
    resumo: s.resumo,
    prioridades: s.prioridades.map((p) => p.texto),
    padroes: s.padroes,
    markdown: linhas.join("\n"),
  };
}

function mockFetch(url, body) {
  let resposta;

  if (url.endsWith("/api/chat")) {
    const mensagens = (body && body.mensagens) || [];
    const doUtilizador = mensagens.filter((m) => m.role === "user");
    const ultima = doUtilizador.length ? doUtilizador[doUtilizador.length - 1].content : "";
    if (/n[aã]o vejo sa[ií]da|em baixo h[aá] semanas/i.test(ultima)) {
      resposta = MOCK_ALERTA;
    } else {
      resposta = MOCK_CHAT[doUtilizador.length] || MOCK_FIM_CONVERSA;
    }
  } else if (url.endsWith("/api/fechar")) {
    resposta = MOCK_FECHO;
  } else if (url.endsWith("/api/guardar")) {
    const semana = body && body.semana;
    if (semana && !MOCK_MEMORIA.semanas.some((s) => s.semana === semana.semana)) {
      MOCK_MEMORIA.semanas.push(_semanaParaMemoria(semana));
      MOCK_MEMORIA.padroes = semana.padroes;
      MOCK_MEMORIA.metricas.energia.push({ semana: semana.semana, valor: semana.energia });
      const ant = semana.prioridades_anteriores || [];
      MOCK_MEMORIA.metricas.prioridades_cumpridas.feitas += ant.filter((p) => p.estado === "feito").length;
      MOCK_MEMORIA.metricas.prioridades_cumpridas.parciais += ant.filter((p) => p.estado === "em-parte").length;
      MOCK_MEMORIA.metricas.prioridades_cumpridas.total += ant.length;
    }
    resposta = { ficheiro: `memoria/diario/${semana ? semana.semana : "2026-W44"}.md` };
  } else if (url.endsWith("/api/memoria")) {
    resposta = MOCK_MEMORIA;
  } else if (url.endsWith("/api/resumo-mensal")) {
    resposta = MOCK_RESUMO_MENSAL;
  } else {
    return Promise.reject(new Error(`mockFetch: rota desconhecida ${url}`));
  }

  // Cópia profunda, para o frontend poder editar sem estragar o mock.
  const copia = JSON.parse(JSON.stringify(resposta));
  return new Promise((resolve) => setTimeout(() => resolve(copia), 600));
}
