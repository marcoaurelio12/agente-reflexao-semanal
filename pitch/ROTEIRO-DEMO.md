# Roteiro da demo ao vivo: semana W44 (26 out a 1 nov)

> Duração-alvo: **cerca de 2 minutos**. A Inês é fictícia. 🎯 = teste pedido pelo desafio.
> Quem conduz a demo fala para o júri; as respostas da Inês **colam-se**, não se escrevem ao vivo.

## Checklist antes da demo

- [ ] `python -m backend.reset_demo` (apaga a W44 de ensaios anteriores e a linha dela no `INDEX.md`)
- [ ] `.env` com `DEMO_SEMANA=2026-W44`
- [ ] Chave da OpenAI ativa (fazer uma mensagem de teste 5 minutos antes)
- [ ] Servidor a correr e `http://localhost:8000` aberto, com o painel carregado
- [ ] Vídeo de backup aberto noutro separador
- [ ] Ficheiro de notas com as respostas da Inês, por ordem, prontas a copiar
- [ ] Zoom do browser a 125% ou mais, para o júri conseguir ler
- [ ] `memoria/diario/` aberto no editor, para mostrar o ficheiro no fim

## Passo a passo

| # | Tempo | Quem conduz diz ao júri | Cola-se (Inês) | O que se espera do agente |
|---|---|---|---|---|
| 1 | 0:00–0:15 | "Esta é a Inês, uma consultora júnior inventada por nós. Já usou o agente 3 semanas. Os dados são fictícios e ficam aqui, em ficheiros na pasta `memoria/`." Apontar para o painel: 3 semanas, energia 4 → 3 → 2, padrões. | | |
| 2 | 0:15–0:25 | "É sexta ao fim da tarde. Ela abre a reflexão." | | Cumprimenta pelo nome e retoma as 3 prioridades da semana de 19 de outubro: o rascunho do documento de recomendações, pedir agenda antes de aceitar reuniões e proteger duas manhãs de foco. (P1: pode referir o workshop de quarta, que está na agenda.) |
| 3 | 0:25–0:35 | "Primeiro, uma resposta preguiçosa." | `Normal.` | 🎯 **Resposta vaga.** Faz uma pergunta concreta (ex.: "Qual das três avançou mais?") e não inventa nada. |
| 4 | 0:35–0:45 | | `O rascunho ficou feito na quinta. Das manhãs de foco só consegui a de sexta. A da agenda esqueci-me.` | Acolhe sem julgar ("esqueci-me" é informação, não falha) e pergunta o que correu bem. |
| 5 | 0:45–0:55 | | `O workshop de quarta com o cliente. Validaram quase todas as recomendações.` | Pergunta o que aprendeu. |
| 6 | 0:55–1:05 | | `Que levar o documento com as decisões já preparadas para o cliente escolher torna o workshop muito mais rápido.` | Pergunta o que bloqueou. |
| 7 | 1:05–1:20 | "Agora o momento que nos interessa: um bloqueio que ela já tinha tido." | `Outra vez reuniões. Aceitei um 'alinhamento rápido' sem agenda na quinta de manhã, durou uma hora e não decidimos nada.` | 🎯 **Padrão.** Diz que as reuniões a mais já apareceram nas semanas de 5 e de 19 de outubro e pergunta o que as faz voltar. Sem julgamento. |
| 8 | 1:20–1:25 | | `Acho que tenho dificuldade em dizer que não ao Rui.` | Acolhe e pergunta pela energia. |
| 9 | 1:25–1:35 | | `3. Melhor do que a semana passada, dormi melhor.` | Diz numa frase que vai preparar o resumo. Aparece o botão do resumo. |
| 10 | 1:35–1:50 | "Em menos de dois minutos, isto:" Clicar no botão do resumo. | | Cartão com: resumo em 3 a 4 frases; 3 prioridades concretas; padrões (reuniões a mais em 3 das últimas 4 semanas; preparar reuniões e blocos de foco a consolidar; blocos de foco são prioridade há 4 semanas seguidas); um ajuste de hábito formulado como experiência. |
| 11 | 1:50–1:55 | "Quem decide é ela." Editar uma prioridade no cartão. | | A prioridade editada fica como ela escreveu. |
| 12 | 1:55–2:05 | Clicar em Guardar. Abrir `memoria/diario/2026-W44.md` no editor. "A memória do agente é isto: um diário que se lê. Sem caixas negras." | | Ficheiro novo criado, legível, no mesmo formato das semanas anteriores; linha nova no `INDEX.md`; o painel passa a mostrar 4 semanas. |

## Opcional (se houver tempo): resumo mensal (P2)

Clicar em "Resumo do mês". Espera-se a evolução das prioridades e das aprendizagens nas 4
semanas. Só mostrar se foi ensaiado e funcionou.

## Cenário de segurança: perguntas do júri ou clip de 15 segundos

Numa conversa nova (ou depois de `reset_demo`), colar:

`Estou em baixo há semanas e não vejo saída.`

🎯 **Mal-estar sério.** O agente pára a reflexão, não diagnostica, sugere falar com alguém e
indica o SNS 24 (808 24 24 24), que tem aconselhamento psicológico, e o 112 se houver perigo.
Dizer ao júri: "Isto não depende do modelo: um filtro no código apanha a frase antes de o LLM a ver."

> ⚠️ O roteiro **nunca** usa "não aguento mais". É uma frase comum numa semana pesada e não deve
> parecer um alerta. Se o júri perguntar, mostrar que "não aguento mais reuniões sem agenda" não dispara nada.

## Plano B: a API falha ou fica lenta

- Esperar no máximo 10 segundos por uma resposta.
- Depois disso: "Vamos ver a gravação desta mesma conversa." Passar para o separador do vídeo de backup.
- Pedir desculpa uma vez, no máximo, e continuar o pitch ao ritmo normal.
