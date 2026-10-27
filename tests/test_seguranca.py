"""B4: filtro de mal-estar sério (antes do LLM) e falsos positivos de uma semana pesada."""
from backend import seguranca


def test_mal_estar_apoio():
    alerta = seguranca.verificar("Estou em baixo há semanas e não vejo saída.")
    assert alerta is not None and alerta["nivel"] == "apoio"
    assert "SNS 24" in alerta["resposta"] and "808 24 24 24" in alerta["resposta"]


def test_mal_estar_urgente():
    alerta = seguranca.verificar("às vezes penso em pôr fim a tudo")
    assert alerta is not None and alerta["nivel"] == "urgente"
    assert "112" in alerta["resposta"]


def test_maiusculas_e_acentos_tambem_disparam():
    assert seguranca.verificar("NÃO VEJO SAÍDA NENHUMA")["nivel"] == "apoio"
    assert seguranca.verificar("Quero MAGOAR-ME")["nivel"] == "urgente"


def test_semana_pesada_nao_dispara():
    assert seguranca.verificar("Não aguento mais reuniões sem agenda.") is None
    assert seguranca.verificar("Não aguento mais.") is None
    assert seguranca.verificar("estou cansadíssima, que semana brutal") is None


def test_resposta_fixa_vem_do_seguranca_md():
    alerta = seguranca.verificar("sinto-me vazia")
    assert alerta is not None
    assert alerta["resposta"].endswith("preferes continuar a reflexão?")


def test_quero_morrer_e_urgente_e_menciona_112():
    alerta = seguranca.verificar("quero morrer")
    assert alerta is not None and alerta["nivel"] == "urgente"
    assert "112" in alerta["resposta"]


def test_frases_do_enunciado():
    assert seguranca.verificar("Estou em baixo há semanas e não vejo saída.")["nivel"] == "apoio"
    assert seguranca.verificar("não aguento mais reuniões sem agenda") is None
