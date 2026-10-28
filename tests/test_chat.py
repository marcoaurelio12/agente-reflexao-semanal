"""Cenários de utilizador contra POST /api/chat e o fluxo completo (SCOPE.md §Testes 1, 2, 3 e 5).

Corre em modo mock, mas os invariantes (filtro antes do LLM, nota de resposta vaga,
marcador de fecho, padrões no fecho, guardar no diário) são os mesmos com a chave real.
"""
import shutil

from backend import llm, memoria

# As respostas da Inês no roteiro da demo (pitch/ROTEIRO-DEMO.md, passos 3 a 9).
RESPOSTAS_INES = [
    "Normal.",
    "O rascunho ficou feito na quinta. Das manhãs de foco só consegui a de sexta. "
    "A da agenda esqueci-me.",
    "O workshop de quarta com o cliente. Validaram quase todas as recomendações.",
    "Que levar o documento com as decisões já preparadas para o cliente escolher "
    "torna o workshop muito mais rápido.",
    "Outra vez reuniões. Aceitei um 'alinhamento rápido' sem agenda na quinta de manhã, "
    "durou uma hora e não decidimos nada.",
    "Acho que tenho dificuldade em dizer que não ao Rui.",
    "3. Melhor do que a semana passada, dormi melhor.",
]


def _chat(cliente, historico):
    r = cliente.post("/api/chat", json={"mensagens": historico})
    assert r.status_code == 200, r.text
    return r.json()


def conversa_do_roteiro(cliente):
    """Corre a conversa toda do roteiro; devolve (histórico completo, última resposta)."""
    historico = []
    resposta = _chat(cliente, historico)
    historico.append({"role": "assistant", "content": resposta["resposta"]})
    for texto in RESPOSTAS_INES:
        historico.append({"role": "user", "content": texto})
        resposta = _chat(cliente, historico)
        historico.append({"role": "assistant", "content": resposta["resposta"]})
    return historico, resposta


# ---------------------------------------------------------------------------
# Abertura e perguntas
# ---------------------------------------------------------------------------

def test_abertura_cumprimenta_e_retoma_as_prioridades(cliente):
    r = _chat(cliente, [])
    assert "Inês" in r["resposta"]
    assert "prioridades" in r["resposta"].lower()
    assert r["resposta"].rstrip().endswith("?")
    assert r["pronto_para_fechar"] is False and r["alerta_seguranca"] is False


def test_resposta_vaga_leva_nota_de_seguimento_ao_llm(cliente, monkeypatch):
    capturado = {}

    def fake(system, mensagens):
        capturado.update(system=system, mensagens=mensagens)
        return "Qual das três avançou mais?"

    monkeypatch.setattr(llm, "responder", fake)
    historico = [{"role": "assistant", "content": "Olá, Inês. Como correram as prioridades?"},
                 {"role": "user", "content": "Normal."}]
    r = _chat(cliente, historico)
    assert r["resposta"] == "Qual das três avançou mais?"
    assert "A última resposta foi vaga" in capturado["system"]
    assert capturado["mensagens"] == historico


def test_resposta_com_substancia_nao_leva_a_nota(cliente, monkeypatch):
    capturado = {}
    monkeypatch.setattr(llm, "responder", lambda system, mensagens: capturado.setdefault("system", system) or "Fica registado.")
    _chat(cliente, [{"role": "user", "content": RESPOSTAS_INES[1]}])
    assert "A última resposta foi vaga" not in capturado["system"]


# ---------------------------------------------------------------------------
# Segurança: o filtro corre antes do LLM
# ---------------------------------------------------------------------------

def test_mal_estar_apoio_nao_chega_ao_llm(cliente, monkeypatch):
    chamado = []

    def fake(system, mensagens):
        chamado.append(True)
        return "NAO DEVIA ACONTECER"

    monkeypatch.setattr(llm, "responder", fake)
    r = _chat(cliente, [{"role": "user", "content": "Estou em baixo há semanas e não vejo saída."}])
    assert r["alerta_seguranca"] is True
    assert "SNS 24" in r["resposta"] and "808 24 24 24" in r["resposta"]
    assert r["pronto_para_fechar"] is False
    assert not chamado


def test_mal_estar_urgente_para_a_reflexao(cliente, monkeypatch):
    monkeypatch.setattr(llm, "responder", lambda *a: "NAO DEVIA ACONTECER")
    r = _chat(cliente, [{"role": "user", "content": "às vezes penso em pôr fim a tudo"}])
    assert r["alerta_seguranca"] is True
    assert "112" in r["resposta"]
    assert r["pronto_para_fechar"] is False


def test_semana_pesada_passa_para_o_llm(cliente, monkeypatch):
    monkeypatch.setattr(llm, "responder", lambda *a: "O que te travou mais esta semana?")
    r = _chat(cliente, [{"role": "user", "content": "Não aguento mais reuniões sem agenda."}])
    assert r["alerta_seguranca"] is False
    assert r["resposta"] == "O que te travou mais esta semana?"


# ---------------------------------------------------------------------------
# Fecho da conversa e da semana
# ---------------------------------------------------------------------------

def test_conversa_completa_termina_pronta_para_fechar(cliente):
    historico, ultima = conversa_do_roteiro(cliente)
    assert len(historico) == 2 * len(RESPOSTAS_INES) + 1  # abertura + 7 trocas
    assert ultima["pronto_para_fechar"] is True
    for m in historico:
        assert "<<FECHAR>>" not in m["content"]


def test_fecho_devolve_semana_com_os_padroes_esperados(cliente, monkeypatch):
    monkeypatch.setattr(memoria, "semana_atual",
                        lambda: ("2026-W44", "2026-10-26 a 2026-11-01"))
    historico, _ = conversa_do_roteiro(cliente)
    r = cliente.post("/api/fechar", json={"mensagens": historico})
    assert r.status_code == 200, r.text
    semana = r.json()["semana"]

    assert semana["semana"] == "2026-W44"
    assert semana["periodo"] == "2026-10-26 a 2026-11-01"
    assert semana["energia"] == 3
    assert len(semana["prioridades"]) == 3

    temas = set(memoria.nomes_temas())
    for campo in ("aprendizagens", "bloqueios", "prioridades"):
        assert all(i["tema"] in temas for i in semana[campo]), campo
    assert all(p["estado"] in ("feito", "em-parte", "nao-avancou", "sem-info")
               for p in semana["prioridades_anteriores"])

    chaves = {(p["tipo"], p.get("tema"), tuple(p["semanas"])) for p in semana["padroes"]}
    assert ("bloqueio_recorrente", "reunioes-excessivas",
            ("2026-W41", "2026-W43", "2026-W44")) in chaves
    assert ("prioridade_que_transita", "foco-manha",
            ("2026-W41", "2026-W42", "2026-W43", "2026-W44")) in chaves
    assert not any(p["tipo"] == "energia_em_queda" for p in semana["padroes"])


def test_guardar_escreve_diario_e_painel_passa_a_5_semanas(cliente, monkeypatch, tmp_path):
    monkeypatch.setattr(memoria, "semana_atual",
                        lambda: ("2026-W44", "2026-10-26 a 2026-11-01"))
    historico, _ = conversa_do_roteiro(cliente)
    semana = cliente.post("/api/fechar", json={"mensagens": historico}).json()["semana"]

    # Diário de trabalho numa pasta temporária: nada é escrito em memoria/ verdadeira.
    (tmp_path / "diario").mkdir()
    for f in (memoria.PASTA_DIARIO).glob("*.md"):
        shutil.copy(f, tmp_path / "diario" / f.name)
    shutil.copy(memoria.FICHEIRO_INDEX, tmp_path / "INDEX.md")
    monkeypatch.setattr(memoria, "PASTA_DIARIO", tmp_path / "diario")
    monkeypatch.setattr(memoria, "FICHEIRO_INDEX", tmp_path / "INDEX.md")

    r = cliente.post("/api/guardar", json={"semana": semana})
    assert r.status_code == 200, r.text
    assert r.json() == {"ficheiro": "memoria/diario/2026-W44.md"}
    assert (tmp_path / "diario" / "2026-W44.md").exists()
    assert "- [2026-W44]" in (tmp_path / "INDEX.md").read_text(encoding="utf-8")

    painel = cliente.get("/api/memoria").json()
    assert len(painel["semanas"]) == 5
    assert painel["semanas"][-1]["semana"] == "2026-W44"
    assert [e["valor"] for e in painel["metricas"]["energia"]] == [5, 4, 3, 2, 3]


# ---------------------------------------------------------------------------
# Conversa livre (widget): modo geral
# ---------------------------------------------------------------------------

def test_modo_geral_usa_o_prompt_livre_e_nao_fecha_a_semana(cliente, monkeypatch):
    capturado = {}

    def fake(system, mensagens):
        capturado.update(system=system, mensagens=mensagens)
        return "No teu diário, a semana de 19 de outubro foi a mais pesada: 14 reuniões."

    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder", fake)
    r = _chat_geral(cliente, [{"role": "user", "content": "Qual foi a minha pior semana?"}])
    assert "mais pesada" in r["resposta"]
    assert r["pronto_para_fechar"] is False and r["alerta_seguranca"] is False
    # contexto da conversa livre: GERAL.md, não o AGENTE.md da reflexão
    assert "Conversa livre" in capturado["system"]
    assert "Quem é a pessoa" in capturado["system"]  # o diário continua a entrar
    assert "fluxo da conversa" not in capturado["system"].lower()


def test_modo_geral_em_mock_responde_sem_ir_a_rede(cliente, monkeypatch):
    def fake(*a):
        raise AssertionError("o LLM não deve ser chamado em modo mock")

    monkeypatch.setattr(llm, "responder", fake)
    r = _chat_geral(cliente, [{"role": "user", "content": "Olá"}])
    assert r["resposta"].strip() and r["pronto_para_fechar"] is False


def test_modo_geral_nota_vaga_nao_se_aplica(cliente, monkeypatch):
    capturado = {}

    def fake(system, mensagens):
        capturado.setdefault("system", system)
        return "Pergunta-me o que quiseres sobre as tuas semanas."

    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder", fake)
    _chat_geral(cliente, [{"role": "user", "content": "Normal."}])
    assert "A última resposta foi vaga" not in capturado["system"]


def test_modo_geral_filtro_de_seguranca_continua_antes_do_llm(cliente, monkeypatch):
    monkeypatch.setattr(llm, "responder", lambda *a: "NAO DEVIA ACONTECER")
    r = _chat_geral(cliente, [{"role": "user", "content": "Estou em baixo há semanas e não vejo saída."}])
    assert r["alerta_seguranca"] is True
    assert "SNS 24" in r["resposta"]


def _chat_geral(cliente, historico):
    r = cliente.post("/api/chat", json={"mensagens": historico, "modo": "geral"})
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# Robustez
# ---------------------------------------------------------------------------

def test_mensagens_fora_do_roteiro_nao_rebentam(cliente):
    historico = []
    resposta = _chat(cliente, historico)
    historico.append({"role": "assistant", "content": resposta["resposta"]})
    for texto in ["e tu, quem és?", "posso ver o que sabes sobre mim?", "esquece, não importa"]:
        historico.append({"role": "user", "content": texto})
        resposta = _chat(cliente, historico)
        historico.append({"role": "assistant", "content": resposta["resposta"]})
        assert resposta["resposta"].strip()


def test_painel_de_memoria_tem_a_estrutura_do_contrato(cliente):
    painel = cliente.get("/api/memoria").json()
    assert "Inês" in painel["contexto"]
    assert [s["semana"] for s in painel["semanas"]] == ["2026-W40", "2026-W41", "2026-W42", "2026-W43"]
    assert [e["valor"] for e in painel["metricas"]["energia"]] == [5, 4, 3, 2]
    assert painel["semanas"][-1]["resumo"].strip()
    assert isinstance(painel["padroes"], list)
