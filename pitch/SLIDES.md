# Slides: storyline

> Formato previsto: cerca de **3 min de pitch + 2 min de demo**. Confirmar com a organização
> (tarefa P1) e cortar slides se o tempo for menor. "Quem fala" é por função; ponham os nomes
> depois de decidirem.

## Critérios que a equipa anotou

- Boa postura
- Tom de voz e energia
- Qualidade técnica
- Mostrar a arquitetura e o core do projeto
- Maximizar a utilidade e mostrar as mais-valias
- Escalabilidade
- Métricas

## Storyline

| # | Título | O que diz | O que mostra | Quem fala | Tempo |
|---|---|---|---|---|---|
| 1 | **Agente de reflexão semanal** | "5 minutos à sexta para aprender com a semana, com memória." | Nome do projeto, a frase e o número do desafio (05 · Reflexão) | Pitch A | 0:10 |
| 2 | **O problema** | As semanas passam. Os mesmos bloqueios repetem-se. Ninguém se lembra do que disse há 3 semanas, por isso não dá para ver o padrão. Refletir ajuda, mas ninguém tem tempo. | Três semanas seguidas com o mesmo bloqueio, lado a lado | Pitch A | 0:25 |
| 3 | **A Inês** | Consultora júnior, 27 anos, num projeto para um cliente. Persona fictícia, criada para a demo. Quer aprender com a semana sem gastar mais de 5 minutos. | Ficha curta da persona (de `memoria/CONTEXTO.md`) e "dados fictícios" bem visível | Pitch A | 0:15 |
| 4 | **A solução** | Uma conversa de 5 minutos com 4 perguntas. No fim: resumo da semana, 3 prioridades concretas, padrões entre semanas e 1 pequeno ajuste de hábito. | Fluxo em 4 passos: conversa → resumo → prioridades e padrões → ajuste | Pitch A | 0:20 |
| 5 | **Demo ao vivo** | Ver `ROTEIRO-DEMO.md`. | A app | Pitch B | 2:00 |
| 6 | **Como funciona** | O contexto vive em ficheiros markdown: `agente/` (como o agente fala e pergunta) e `memoria/` (o diário). O LLM conversa e extrai a semana em formato estruturado. Os padrões são contados por código, não adivinhados: é uma contagem auditável. Bom contexto = bom output. As perguntas seguem o ciclo de Gibbs e o modelo de Rolfe. | Diagrama da arquitetura (tarefa P3) e um excerto de uma entrada do diário | Pitch A | 0:35 |
| 7 | **Confiança e cuidados** | Não é terapeuta e não faz diagnósticos. Um filtro de segurança corre antes do LLM e encaminha para apoio humano (SNS 24, 112). Guarda-se só o resumo, não a transcrição. Os dados ficam em ficheiros no computador que corre o servidor. No modo live, o texto da conversa é enviado à API do Gemini para gerar as respostas; no modo guião não sai do computador. Sem tom de avaliação: o agente pergunta e propõe experiências. | 5 ícones com uma linha cada | Pitch B | 0:30 |
| 8 | **Visão e escalabilidade** | Da pessoa para a equipa: agenda real, transcrições de reuniões do Teams, boas práticas por papel. Métricas de equipa só agregadas e anónimas, nunca individuais para a chefia. Começar por uma equipa, por exemplo de consultoria, e alargar depois. Base de dados a sério quando houver vários utilizadores. | Linha do tempo: hoje (protótipo) → equipa piloto → empresa | Pitch A | 0:30 |
| 9 | **Métricas e equipa** | Tempo da reflexão (medido na demo, tarefa D5). Percentagem de prioridades cumpridas por semana. Padrões detetados. Evolução da energia. | 4 números grandes e os nomes e funções da equipa | Pitch B | 0:15 |

Total sem a demo: cerca de 3 min.

## Notas para quem apresenta

- Abrir com o problema, não com a tecnologia.
- No slide 6, mostrar o ficheiro do diário vale mais do que explicar o diagrama.
- No slide 7, dizer onde ficam os dados antes de o júri perguntar.
- Frases curtas. Uma ideia por slide.
