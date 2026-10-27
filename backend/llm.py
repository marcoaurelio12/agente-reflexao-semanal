"""Chamadas ao LLM: GLM-5.3 da z.ai pelo SDK openai (API compatível), com modo mock sem chave.

Lê do .env: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_REASONING_EFFORT
(ver .env.example e DECISOES.md n.º 2). Sem OPENAI_API_KEY corre em modo mock, com a conversa
da W44 de pitch/ROTEIRO-DEMO.md, igual à de frontend/mock.js.
Dono: Backend A (tarefas A1 e A4).
"""
import copy
import json
import os
import re
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
load_dotenv(RAIZ / ".env")

URL_POR_OMISSAO = "https://api.z.ai/api/coding/paas/v4"
MODELO_POR_OMISSAO = "glm-5.3"
MARCADOR_FECHO = "<<FECHAR>>"


def modo_mock() -> bool:
    return not os.getenv("OPENAI_API_KEY", "").strip()


def responder(system: str, mensagens: list[dict]) -> str:
    """Próxima mensagem do agente na conversa. Sem chave: resposta pré-escrita do modo mock."""
    if modo_mock():
        return _mock_responder(mensagens)
    return _completar(system, mensagens)


def extrair_json(system: str, mensagens: list[dict]) -> dict:
    """Fecho da semana: o JSON pedido em agente/FECHO.md (response_format JSON + 1 nova tentativa)."""
    if modo_mock():
        return copy.deepcopy(_MOCK_FECHO)
    erro = None
    for _ in range(2):
        texto = _completar(system, mensagens, response_format={"type": "json_object"})
        try:
            return _ler_json(texto)
        except ValueError as e:  # json.JSONDecodeError também é ValueError
            erro = e
    raise RuntimeError(f"O LLM devolveu um JSON inválido duas vezes seguidas: {erro}") from erro


@lru_cache(maxsize=1)
def _cliente():
    from openai import OpenAI

    return OpenAI(
        api_key=os.environ["OPENAI_API_KEY"].strip(),
        base_url=os.getenv("OPENAI_BASE_URL", "").strip() or URL_POR_OMISSAO,
        timeout=60,
        max_retries=1,
    )


def _completar(system: str, mensagens: list[dict], **extra) -> str:
    conversa = [{"role": m["role"], "content": m["content"]} for m in mensagens]
    if not any(m["role"] == "user" for m in conversa):
        # Abertura: algumas APIs recusam pedidos só com a mensagem de sistema.
        conversa.append({"role": "user", "content": "Olá."})
    pedido = {
        "model": os.getenv("OPENAI_MODEL", "").strip() or MODELO_POR_OMISSAO,
        "messages": ([{"role": "system", "content": system}] if system else []) + conversa,
        **extra,
    }
    esforco = os.getenv("OPENAI_REASONING_EFFORT", "").strip()
    if esforco:
        pedido["reasoning_effort"] = esforco
    resposta = _cliente().chat.completions.create(**pedido)
    return (resposta.choices[0].message.content or "").strip()


def _ler_json(texto: str) -> dict:
    """json.loads tolerante a um bloco ```json à volta, que o GLM às vezes acrescenta."""
    limpo = re.sub(r"^```(?:json)?\s*|\s*```$", "", texto.strip())
    dados = json.loads(limpo)
    if not isinstance(dados, dict):
        raise ValueError(f"esperava um objeto JSON, veio {type(dados).__name__}")
    return dados


def _mock_responder(mensagens: list[dict]) -> str:
    """Escolhe a resposta pelo número de mensagens do utilizador já enviadas."""
    n = sum(1 for m in mensagens if m["role"] == "user")
    if n < len(_MOCK_CONVERSA):
        return _MOCK_CONVERSA[n]
    return _MOCK_FIM


# ---------------------------------------------------------------------------
# Modo mock: os mesmos textos de frontend/mock.js (MOCK_CHAT e MOCK_FECHO).
# São respostas de exemplo, não instruções para o LLM (essas vivem em agente/).
# ---------------------------------------------------------------------------

_MOCK_CONVERSA = [
    # 0: abertura (mensagens vazias)
    "Olá, Inês. Na semana passada escolheste três prioridades: fechar o primeiro rascunho do "
    "documento de recomendações, pedir a agenda antes de aceitar reuniões novas e proteger duas "
    "manhãs de foco. Como correram?",
    # 1: depois de "Normal." (resposta vaga, seguimento concreto)
    "Qual das três avançou mais, e qual ficou mais para trás?",
    # 2: depois do ponto de situação das prioridades
    "Fica registado. E o que correu bem esta semana?",
    # 3: depois do "correu bem"
    "O que aprendeste esta semana, sobre o trabalho ou sobre a forma como trabalhas?",
    # 4: depois da aprendizagem
    "Isso liga com o que notaste na semana de 5 de outubro, quando preparar a agenda na véspera "
    "fez o workshop render mais. O que te travou ou te fez perder mais tempo?",
    # 5: depois do bloqueio (o agente repara no padrão)
    "As reuniões a mais também apareceram na semana de 5 e na de 19 de outubro: é a terceira vez "
    "em quatro semanas. O que achas que as faz voltar?",
    # 6: depois da causa
    "Faz sentido olhar para isso. Como está a tua energia, de 1 a 5? E o que mais contribuiu "
    "para isso?",
    # 7: depois da energia, fecho
    "Subiu em relação à semana de 19 de outubro. Vou preparar o resumo da tua semana.\n"
    + MARCADOR_FECHO,
]

_MOCK_FIM = 'Já tenho tudo o que preciso. Carrega em "Ver resumo da semana".\n' + MARCADOR_FECHO

# Formato de agente/FECHO.md: sem semana, periodo, registado_em e padroes (o servidor acrescenta).
_MOCK_FECHO = {
    "energia": 3,
    "energia_nota": "Melhor do que a semana passada, dormi melhor.",
    "prioridades_anteriores": [
        {
            "texto": "Fechar o primeiro rascunho do documento de recomendações até sexta.",
            "estado": "feito",
            "nota": "Ficou feito na quinta.",
        },
        {
            "texto": "Pedir a agenda antes de aceitar reuniões novas e recusar as que não a têm.",
            "estado": "nao-avancou",
            "nota": "Esqueci-me.",
        },
        {
            "texto": "Proteger duas manhãs de foco.",
            "estado": "em-parte",
            "nota": "Só consegui a de sexta.",
        },
    ],
    "correu_bem": [
        "O workshop de quarta com o cliente correu bem: validaram quase todas as recomendações.",
        "Fechei o rascunho do documento na quinta.",
    ],
    "aprendizagens": [
        {
            "texto": "Levar o documento com as decisões já preparadas para o cliente escolher "
            "torna o workshop muito mais rápido.",
            "tema": "preparar-reunioes",
        },
    ],
    "bloqueios": [
        {
            "texto": 'Aceitei um "alinhamento rápido" sem agenda na quinta de manhã; durou uma '
            "hora e não decidimos nada.",
            "tema": "reunioes-excessivas",
        },
    ],
    "resumo": "O rascunho do documento ficou fechado e o workshop com o cliente validou quase "
    "todas as recomendações. Preparar as decisões antes do workshop voltou a fazer diferença. "
    "As reuniões sem agenda voltaram a ocupar uma manhã, e a dificuldade em dizer que não "
    "apareceu como possível causa. A energia subiu um pouco em relação à semana anterior.",
    "prioridades": [
        {
            "texto": "Enviar ao cliente a versão final do documento de recomendações até quarta-feira.",
            "tema": "entregas",
        },
        {
            "texto": "Antes de aceitar uma reunião nova, perguntar qual é o objetivo e propor "
            "resolver por mensagem quando não houver resposta.",
            "tema": "dizer-nao",
        },
        {
            "texto": "Marcar na segunda de manhã as duas manhãs de foco da semana.",
            "tema": "foco-manha",
        },
    ],
    "ajuste_habito": 'Experimenta ter uma frase pronta para os convites sem agenda, por exemplo: '
    '"Qual é o objetivo? Se for rápido, resolvemos por mensagem." Assim não tens de decidir na hora.',
}
