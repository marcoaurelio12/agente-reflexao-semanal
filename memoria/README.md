# memoria/: o diário do agente (é a nossa "base de dados")

**Tudo aqui é fictício.** A Inês não existe; foi inventada para testar a memória do agente.

## Onde ficam os dados

Em ficheiros markdown nesta pasta, no computador onde corre o servidor. Não há base de dados nem cloud.

| Ficheiro | O que tem |
|---|---|
| `CONTEXTO.md` | Quem é a pessoa: papel, objetivos, preferências |
| `INDEX.md` | Uma linha por semana; é o primeiro ficheiro que o agente lê |
| `diario/AAAA-Www.md` | Uma entrada de diário por semana (ex.: `2026-W43` = 19 a 25 de outubro) |
| `agenda/AAAA-Www.md` | Agenda da semana (fictícia; numa versão real viria do calendário, com autorização) |
| `notas/AAAA-MM-DD.md` | Notas do dia (1-3 linhas, escritas pela pessoa); só existem os dias anotados |
| `CONSENTIMENTO.md` | O que o agente pode ler (toggles); lido a cada pedido |
| `.lixeira/<token>/` | O diário do «Apagar tudo» até ao «Desfazer» (o token é o nome da pasta) |

**Notas do dia:** um ficheiro por dia com notas (`- HH:MM — texto literal`). O tema no
frontmatter é sugestão automática (matching léxico sobre `agente/temas.yaml`); a nota nunca é
resumo nem transcrição — são as palavras da pessoa. Ao guardar a semana, os ficheiros de notas
dessa semana são apagados: fica o essencial (`temas.notas`) no frontmatter do diário. Sem linha
no `INDEX.md` (o índice é do diário semanal; notas são efémeras).

**Consentimento:** `CONSENTIMENTO.md` guarda três toggles no frontmatter (agenda,
conversa_livre, diario_completo_no_widget) e uma linha de histórico por mudança. Omissões:
agenda desligada («a agenda só com autorização» é mecanismo, não promessa), conversa livre
ligada, widget só com as últimas 4 semanas. O backend lê-o a cada pedido e filtra o contexto
de facto.

Cada entrada do diário tem duas partes:
- **Cabeçalho (frontmatter YAML):** energia, etiquetas de tema e padrões. É o que o código usa
  para contar repetições. As etiquetas válidas estão em `agente/temas.yaml`.
- **Corpo (markdown):** o diário legível: resumo, correu bem, aprendi, bloqueou, energia,
  prioridades, ajuste de hábito. É isto que o LLM lê.

## O que se guarda e o que não se guarda

- Guarda-se a entrada estruturada da semana.
- **Não** se guarda a transcrição da conversa.
- Durante a conversa, no modo live, o texto é enviado à API do Gemini para gerar as respostas;
  no modo guião não sai do computador. Numa versão real isto tem de constar do consentimento
  (alternativas: modelo local ou um fornecedor com processamento na UE).

## Apagar

Apagar uma semana = apagar o ficheiro e a linha correspondente no `INDEX.md`.

## Reset da demo

Antes de cada ensaio: `python -m backend.reset_demo` (apaga a W44 e a linha dela no `INDEX.md`).

## A história da Inês (para quem faz o pitch)

| Semana | Energia | Bloqueio principal | Aprendizagem |
|---|---|---|---|
| W40 (28 set a 4 out) | 5 | Âmbito do diagnóstico ainda difuso | Planear a semana num sítio só |
| W41 (5 a 11 out) | 4 | Reuniões de última hora partem as manhãs | Preparar a reunião na véspera |
| W42 (12 a 18 out) | 3 | Dados de outra equipa atrasados; notificações | As manhãs de foco rendem o dobro |
| W43 (19 a 25 out) | 2 | 14 reuniões (2.ª vez); dormiu mal | Foco outra vez; pedir ajuda cedo |
| **W44 (26 out a 1 nov)** | demo ao vivo | Reuniões **pela 3.ª vez** → o agente tem de reparar | Preparar as decisões para o cliente (volta a "preparar reuniões") |
