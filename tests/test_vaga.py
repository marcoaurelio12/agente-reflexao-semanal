"""B4: deteção de respostas vagas (backend/seguranca.py e agente/PERGUNTAS.md)."""
from backend import seguranca


def test_respostas_vagas():
    for texto in ["normal", "Normal.", "ok", "sei lá", "nada", "o costume", "tudo bem",
                  "mais ou menos", "3", "duas manhãs só"]:
        assert seguranca.e_vaga(texto), texto


def test_respostas_com_substancia_nao_sao_vagas():
    for texto in ["O rascunho ficou feito na quinta.",
                  "3. Melhor do que a semana passada, dormi melhor.",
                  "O workshop de quarta com o cliente correu bem."]:
        assert not seguranca.e_vaga(texto), texto


def test_frases_do_enunciado():
    assert seguranca.e_vaga("Normal.") is True
    assert seguranca.e_vaga("sei lá") is True
    assert seguranca.e_vaga("O workshop de quarta com o cliente correu muito bem.") is False
