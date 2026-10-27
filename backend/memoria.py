"""Memória entre semanas: lê e escreve o diário em markdown de memoria/.

Dono: Backend B (tarefa B1). Contrato em docs/ARQUITETURA.md §Interfaces internas.
"""
import json
import os
import re
from datetime import date, timedelta
from pathlib import Path

import yaml
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
PASTA_MEMORIA = RAIZ / "memoria"
PASTA_DIARIO = PASTA_MEMORIA / "diario"
PASTA_AGENDA = PASTA_MEMORIA / "agenda"
PASTA_AGENTE = RAIZ / "agente"
FICHEIRO_CONTEXTO = PASTA_MEMORIA / "CONTEXTO.md"
FICHEIRO_INDEX = PASTA_MEMORIA / "INDEX.md"
FICHEIRO_TEMAS = PASTA_AGENTE / "temas.yaml"

load_dotenv(RAIZ / ".env")

ID_SEMANA = re.compile(r"^\d{4}-W\d{2}$")
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
         "setembro", "outubro", "novembro", "dezembro"]
ESTADOS = {"feito": "feito", "em-parte": "em parte", "nao-avancou": "não avançou",
           "sem-info": "sem informação"}


def _ler(caminho: Path) -> str:
    return caminho.read_text(encoding="utf-8")


def carregar_contexto() -> str:
    """Conteúdo de memoria/CONTEXTO.md (quem é a pessoa)."""
    return _ler(FICHEIRO_CONTEXTO)


def carregar_index() -> str:
    """Conteúdo de memoria/INDEX.md (uma linha por semana)."""
    return _ler(FICHEIRO_INDEX)


def _separar(texto: str) -> tuple[dict, str]:
    """(frontmatter, corpo) de uma entrada do diário."""
    if texto.startswith("---"):
        _, fm, corpo = texto.split("---", 2)
        return yaml.safe_load(fm) or {}, corpo.lstrip("\n")
    return {}, texto


def _secao(corpo: str, titulo: str) -> str:
    """Texto da secção "## <titulo>" até à secção seguinte."""
    m = re.search(rf"^## {re.escape(titulo)}[^\n]*\n(.*?)(?=^## |\Z)", corpo, re.M | re.S)
    return m.group(1).strip() if m else ""


def _itens_numerados(texto: str) -> list[str]:
    itens = []
    for linha in texto.splitlines():
        m = re.match(r"^\d+\.\s+(.*)", linha)
        if m:
            itens.append(m.group(1).strip())
        elif linha.strip() and itens:
            itens[-1] += " " + linha.strip()
    return itens


def listar_semanas(ultimas: int = 4) -> list[dict]:
    """As últimas N entradas do diário, por ordem cronológica (mais antiga primeiro).

    Cada item: {"meta": frontmatter (dict), "markdown": entrada completa, "resumo": texto da secção Resumo}.
    Também traz "corpo" (sem frontmatter) e "prioridades" (lista de textos), para o painel.
    """
    semanas = []
    for caminho in sorted(PASTA_DIARIO.glob("*.md")):
        texto = _ler(caminho)
        meta, corpo = _separar(texto)
        meta["semana"] = str(meta.get("semana") or caminho.stem)
        semanas.append({
            "meta": meta,
            "markdown": texto,
            "corpo": corpo,
            "resumo": " ".join(_secao(corpo, "Resumo").split()),
            "prioridades": _itens_numerados(_secao(corpo, "Prioridades para a semana seguinte")),
        })
    return semanas[-ultimas:] if ultimas > 0 else semanas


def carregar_agenda(semana_id: str) -> str | None:
    """Conteúdo de memoria/agenda/<semana_id>.md, ou None se não existir."""
    caminho = PASTA_AGENDA / f"{semana_id}.md"
    return _ler(caminho) if ID_SEMANA.match(semana_id) and caminho.exists() else None


def meta_de(semana: dict) -> dict:
    """Converte o JSON do /api/fechar para o formato do frontmatter (temas, energia, contagens)."""
    anteriores = semana.get("prioridades_anteriores") or []
    return {
        "semana": semana.get("semana"),
        "periodo": semana.get("periodo"),
        "registado_em": semana.get("registado_em"),
        "energia": semana.get("energia"),
        "temas": {
            "bloqueios": [i.get("tema") or "outro" for i in semana.get("bloqueios") or []],
            "aprendizagens": [i.get("tema") or "outro" for i in semana.get("aprendizagens") or []],
            "prioridades": [i.get("tema") or "outro" for i in semana.get("prioridades") or []],
        },
        "prioridades_anteriores": {
            "feitas": sum(1 for p in anteriores if p.get("estado") == "feito"),
            "parciais": sum(1 for p in anteriores if p.get("estado") == "em-parte"),
            "total": len(anteriores),
        },
        "padroes": semana.get("padroes") or [],
    }


def _datas(periodo: str) -> tuple[date, date]:
    inicio, fim = periodo.split(" a ")
    return date.fromisoformat(inicio.strip()), date.fromisoformat(fim.strip())


def periodo_legivel(periodo: str) -> str:
    """"2026-10-26 a 2026-11-01" -> "26 de outubro a 1 de novembro"; mesmo mês: "19 a 25 de outubro"."""
    a, b = _datas(periodo)
    if a.month == b.month:
        return f"{a.day} a {b.day} de {MESES[b.month - 1]}"
    return f"{a.day} de {MESES[a.month - 1]} a {b.day} de {MESES[b.month - 1]}"


def _periodo_curto(periodo: str) -> str:
    """Formato do INDEX.md: "19 a 25 out" ou "26 out a 1 nov"."""
    a, b = _datas(periodo)
    if a.month == b.month:
        return f"{a.day} a {b.day} {MESES[b.month - 1][:3]}"
    return f"{a.day} {MESES[a.month - 1][:3]} a {b.day} {MESES[b.month - 1][:3]}"


def _lista_yaml(valores: list) -> str:
    return "[" + ", ".join(str(v) for v in valores) + "]"


def _frontmatter(meta: dict) -> str:
    t, pa = meta["temas"], meta["prioridades_anteriores"]
    energia = "null" if meta["energia"] is None else meta["energia"]
    linhas = [
        "---",
        f"semana: {meta['semana']}",
        f"periodo: {meta['periodo']}",
        f"registado_em: {meta['registado_em']}",
        f"energia: {energia}",
        "temas:",
        f"  bloqueios: {_lista_yaml(t['bloqueios'])}",
        f"  aprendizagens: {_lista_yaml(t['aprendizagens'])}",
        f"  prioridades: {_lista_yaml(t['prioridades'])}",
        f"prioridades_anteriores: {{feitas: {pa['feitas']}, parciais: {pa['parciais']}, total: {pa['total']}}}",
    ]
    if not meta["padroes"]:
        linhas.append("padroes: []")
    else:
        linhas.append("padroes:")
        for p in meta["padroes"]:
            linhas += [
                f"  - tipo: {p['tipo']}",
                f"    tema: {p.get('tema') or 'null'}",
                f"    semanas: {_lista_yaml(p['semanas'])}",
                f"    mensagem: {json.dumps(p['mensagem'], ensure_ascii=False)}",
            ]
    linhas.append("---")
    return "\n".join(linhas)


def _sem_ponto(texto: str) -> str:
    return (texto or "").strip().rstrip(".")


def _marcadores(itens: list[str]) -> list[str]:
    return [f"- {i}" for i in itens] if itens else ["Nada registado."]


def _corpo(semana: dict) -> str:
    anteriores = []
    for p in semana.get("prioridades_anteriores") or []:
        nota = _sem_ponto(p.get("nota"))
        estado = ESTADOS.get(p.get("estado"), p.get("estado") or "sem informação")
        anteriores.append(f"- {_sem_ponto(p.get('texto'))}: **{estado}**" + (f" ({nota})" if nota else "") + ".")
    energia = semana.get("energia")
    partes = [
        f"# Semana de {periodo_legivel(semana['periodo'])}", "",
        "## Resumo", "", semana.get("resumo") or "", "",
        "## Prioridades da semana passada", "",
        *(anteriores or ["Sem prioridades da semana passada."]), "",
        "## Correu bem", "", *_marcadores(semana.get("correu_bem") or []), "",
        "## Aprendi", "", *_marcadores([i["texto"] for i in semana.get("aprendizagens") or []]), "",
        "## Bloqueou", "", *_marcadores([i["texto"] for i in semana.get("bloqueios") or []]), "",
        f"## Energia: {energia}/5" if energia is not None else "## Energia: sem registo", "",
        semana.get("energia_nota") or "", "",
        "## Prioridades para a semana seguinte", "",
        *[f"{n}. {p['texto']}" for n, p in enumerate(semana.get("prioridades") or [], 1)], "",
        "## Ajuste de hábito", "", semana.get("ajuste_habito") or "", "",
        "## Padrões assinalados", "",
        *([f"- {p['mensagem']}" for p in semana.get("padroes") or []] or ["Nenhum."]),
    ]
    return "\n".join(partes) + "\n"


def guardar_semana(semana: dict) -> str:
    """Escreve memoria/diario/<semana>.md no formato de 2026-W43.md e acrescenta a linha no INDEX.md.

    Devolve o caminho relativo à raiz (ex.: "memoria/diario/2026-W44.md").
    """
    sid = str(semana.get("semana", ""))
    if not ID_SEMANA.match(sid):
        raise ValueError(f"semana inválida: {sid!r}")
    meta = meta_de(semana)
    caminho = PASTA_DIARIO / f"{sid}.md"
    caminho.write_text(_frontmatter(meta) + "\n\n" + _corpo(semana), encoding="utf-8", newline="\n")

    t = meta["temas"]
    energia = f"energia {meta['energia']}/5" if meta["energia"] is not None else "energia sem registo"
    linha = (f"- [{sid}](diario/{sid}.md) · {_periodo_curto(meta['periodo'])} · {energia} · "
             f"{', '.join(t['bloqueios']) or '—'} · {', '.join(t['aprendizagens']) or '—'}")
    linhas = [l for l in carregar_index().splitlines() if not l.startswith(f"- [{sid}]")]
    pos = next((i for i, l in enumerate(linhas) if l.startswith("- [")), len(linhas))
    linhas.insert(pos, linha)
    FICHEIRO_INDEX.write_text("\n".join(linhas) + "\n", encoding="utf-8", newline="\n")
    return f"memoria/diario/{sid}.md"


def semana_atual() -> tuple[str, str]:
    """("2026-W44", "2026-10-26 a 2026-11-01"). Respeita DEMO_SEMANA do .env."""
    demo = os.getenv("DEMO_SEMANA", "").strip()
    if ID_SEMANA.match(demo):
        ano, sem = int(demo[:4]), int(demo[6:])
    else:
        ano, sem, _ = date.today().isocalendar()
    inicio = date.fromisocalendar(ano, sem, 1)
    return f"{ano}-W{sem:02d}", f"{inicio} a {inicio + timedelta(days=6)}"


def carregar_temas() -> dict:
    """Conteúdo de agente/temas.yaml."""
    return yaml.safe_load(_ler(FICHEIRO_TEMAS))


def nomes_temas() -> dict:
    """{id: nome legível} de todos os grupos de temas.yaml."""
    return {k: v for grupo in carregar_temas().values() for k, v in (grupo or {}).items()}
