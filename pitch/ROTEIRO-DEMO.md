# Roteiro da demo ao vivo: semana 4 da Marta (19 a 23 out)

> Duração-alvo: **cerca de 2 minutos**. A Marta é fictícia. 🎯 = teste pedido pelo desafio.
> Quem conduz a demo fala para o júri; as respostas da Marta **colam-se**, não se escrevem ao vivo.
> Em cada pergunta, por cima da caixa de texto, há botões "Sugestões:" com estas mesmas frases.
> Clicar no botão envia exatamente o mesmo texto que colar.
> As mensagens do agente são escritas pelo GLM-5.3 (só há este modo), por isso as frases variam
> um pouco de ensaio para ensaio; o que o agente pergunta e os padrões são sempre os mesmos.
> **Ensaiar uma vez de ponta a ponta com a chave.**

## Checklist antes da demo

- [ ] Chave da z.ai no `.env` e servidor reiniciado depois de a pôr. Testar 5 minutos antes: as
      mensagens do agente têm de aparecer como "AGENTE · GLM". Sem chave aparecem só como
      "AGENTE" (respostas de reserva).
- [ ] Servidor a correr e `http://localhost:8000` aberto
- [ ] Carregar em "Recomeçar demo" (ou F5) logo antes de começar: o estado vive no browser. O `reset_demo` já não é preciso para este frontend, porque o `app.js` não escreve em `memoria/diario/`.
- [ ] Perfil intacto (Teams ligado, transcrições permitidas, check-in todos os dias). Se alguém mexeu, apagar a chave `reflexao.perfil.v2` do localStorage e recarregar.
- [ ] Ecrã de abertura confere: "Check-in de quinta, 22 out", "Pergunta 1 de 4", pergunta sobre o workshop com o cliente
- [ ] Vídeo de backup aberto noutro separador
- [ ] Ficheiro de notas com as respostas da Marta, por ordem, prontas a copiar
- [ ] Zoom do browser a 125% ou mais, para o júri conseguir ler. Se a largura útil descer abaixo de 1180 px, a página passa a separadores (Dias, Conversa, Contexto): ficar em "Conversa".
- [ ] `memoria/diario/` aberto no editor, só para mostrar o formato do diário se o júri perguntar (este frontend mostra o YAML da semana no ecrã e não escreve nessa pasta)

## Passo a passo

| # | Tempo | Quem conduz diz ao júri | Cola-se (Marta) | O que se espera do agente |
|---|---|---|---|---|
| 1 | 0:00–0:15 | "Esta é a Marta, uma consultora júnior inventada por nós, num projeto para um cliente de retalho. Os dados são fictícios." Apontar para a coluna da esquerda: segunda a quarta já feitas (energia 3, 3, 2), quinta em curso, sexta por fazer. À direita, em "Contexto": a agenda de quinta (workshop com o cliente) e os 4 padrões, todos "ativo". | | Nada a acontecer ainda. Quinta, 22 out, "Pergunta 1 de 4". |
| 2 | 0:15–0:25 | "É quinta ao fim da tarde. O check-in abre sozinho e já traz o contexto do dia." | | Duas linhas de ferramenta: `get_day_context()` (nível 2, 1 evento do Teams, 1 transcrição disponível) e `get_history()` (3 check-ins esta semana, 3 semanas em memória). Depois: "Olá, Marta. Check-in de quinta, 2 minutos. Hoje tiveste o workshop com o cliente. O que correu bem no teu dia?" O relógio (0:00 / 2:00) só arranca na primeira resposta. |
| 3 | 0:25–0:40 | "Primeiro, uma resposta preguiçosa." | `Normal.` | 🎯 **Resposta vaga.** O agente não regista a resposta e pede um momento concreto: "Pensa só em o workshop com o cliente: houve um momento em que algo correu como querias?" O cabeçalho passa a "Pergunta 1 de 4 · clarificação". (A gralha "em o" vem do código; não comentar.) |
| 4 | 0:40–0:50 | | `Quando o cliente validou 4 dos 6 processos ao vivo.` | Avança para a pergunta 2: "Houve alguma coisa que te bloqueou ou atrasou hoje? Se não houve, basta dizer "não"." |
| 5 | 0:50–1:10 | "Agora o momento que nos interessa: um bloqueio que ela já tinha tido." | `Perdi a manhã com pedidos internos e mais uma reunião sem agenda.` | 🎯 **Padrão.** Linha `find_patterns()` ("bloqueio recorrente · reuniões sem agenda ou em excesso"). O agente diz: "Isto já apareceu esta semana (segunda e quarta) e nas semanas 1 e 3. Guardo-o para o relatório de sexta, onde proponho um ajuste." e passa à energia. No painel "Padrões", o bloqueio recorrente mostra semanas 1, 3, 4 e os dias da semana. A frase tem "reunião sem agenda" e **não** dispara o alerta de mal-estar. |
| 6 | 1:10–1:20 | | `3, o workshop correu bem mas foi intenso.` | "Registado: 3, acima de quarta (2)." e a última pergunta, que usa a transcrição simulada do workshop: o envio da síntese até terça ficou com a Marta, mas os outros próximos passos ficaram sem responsável. Pergunta o que faltou para os fechar. |
| 7 | 1:20–1:30 | | `Ficaram os próximos passos, mas não os responsáveis de cada um.` | Linhas `wellbeing_check()` ("sem sinais de alerta") e `save_day()`. O agente diz: "Registado. O próximo check-in é sexta, às 17:30." Aparecem dois botões: "Avançar para sexta (simulação)" e "Abrir o relatório semanal". O relógio fica com a duração do check-in. |
| 8 | 1:30–1:35 | "Em vez de esperar pela sexta, vamos ao relatório." Clicar em "Abrir o relatório semanal". | | Página "Relatório semanal · semana 4". Aviso: "4 de 5 check-ins feitos. O relatório atualiza quando registares os restantes." |
| 9 | 1:35–1:50 | "Em menos de dois minutos, isto:" Percorrer o ecrã de cima para baixo. | | 🎯 **Relatório.** Resumo em 4 frases (workshop, bloqueio mais frequente, energia média de 2,8 abaixo da semana passada, 4 de 5 check-ins). Até 4 observações com as palavras dela como prova: reuniões sem agenda (esta semana: segunda, quarta e quinta; também semanas 1 e 3), espera por feedback, pirâmide de Minto a tornar-se hábito, prioridade das devoluções que transita. Depois "Para experimentar na próxima semana": "antes de aceitar uma reunião interna, pedir numa linha qual é a decisão a tomar", com a caixa "Quero testar isto". E "3 prioridades para a semana 5": enviar a síntese do workshop ao cliente (até terça), pedir ao manager feedback sobre o modelo (segunda), reservar 2 manhãs para o relatório final (até quinta), cada uma com "✓ Verbo, entregável e prazo". |
| 10 | 1:50–1:55 | "Quem decide é ela." Editar o texto ou o prazo de uma prioridade. | | A prioridade fica como ela escreveu e o visto verifica-se à medida que se escreve (sem prazo aparece "Falta o prazo."). |
| 11 | 1:55–2:05 | Clicar em "Aprovar e gravar". Descer até "Histórico" e clicar em `semana-04.yaml` (marcado "agora"). "A memória do agente é isto: um ficheiro por semana, que se lê. Sem caixas negras." | | Aviso "Gravado em data/marta/semana-04.yaml." e o botão passa a "Gravado". O gráfico mostra a energia 4, 3, 3, 2,8. Abre-se uma janela com o YAML da semana 4. **A gravação é simulada no browser**: o `app.js` não chama o backend e não escreve nada em `memoria/diario/`. Não dizer ao júri que o ficheiro foi criado em disco. |

## Opcional (se houver tempo): sexta e notas sobre o GLM

- **Sexta:** no passo 7, em vez de abrir o relatório, clicar em "Avançar para sexta (simulação)". Faz mais 4 perguntas (correu bem, bloqueio, energia, e a entrega da síntese ao cliente). O aviso do relatório passa a "5 de 5" e o resumo e a energia média mudam: **ensaiar antes** e só mostrar se funcionou.
- **GLM-5.3 da z.ai:** as mensagens do agente são escritas pelo LLM, a partir do que a aplicação lhe diz para transmitir. No relatório aparece o botão "Reescrever com o GLM". As regras de padrões e o alerta de mal-estar continuam a ser código, não LLM. Neste motor é o LLM que classifica o tema do bloqueio no passo 5, por isso o texto "já apareceu esta semana… e nas semanas 1 e 3" pode não sair igual. Confirmar no ensaio antes de o usar em público.
- O resumo mensal (P2) não existe neste frontend.

## Cenário de segurança: perguntas do júri ou clip de 15 segundos

Carregar em "Recomeçar demo" e, na primeira pergunta, colar:

`Ando exausta e não consigo dormir há semanas.`

🎯 **Mal-estar sério.** A frase aparece na conversa, surge a linha `wellbeing_check()` ("sinais de alerta · encaminhar para apoio humano") e o agente responde com um texto fixo: agradece, diz que isto merece mais atenção do que um check-in, deixa as perguntas de lado e sugere falar com alguém. Aparece o cartão "Apoio humano": pessoa de confiança, chefia ou RH, médico de família e SNS 24 (808 24 24 24, com aconselhamento psicológico). O cartão diz que esta parte não é usada para padrões nem fica gravada, e que o agente não faz diagnósticos. A caixa de texto fica bloqueada ("Escolhe uma das opções acima.") até clicar em:

- "Terminar por hoje": o agente diz "Fica por aqui. Não gravei nada deste check-in. Cuida de ti." e o dia fica "interrompido", sem nada gravado.
- "Continuar o check-in": retoma a pergunta onde estava ("Combinado, sem pressa.").

Dizer ao júri: "Isto não depende do modelo: o filtro corre no código, antes de qualquer chamada ao LLM." É uma lista de palavras-chave (exaust-, esgotad-, "não consigo dormir", "sem esperança", desesper-, "não aguento", burnout), não uma análise de sentido.

> ⚠️ **A lista de palavras mudou face ao roteiro anterior.**
> - "Não aguento mais" **dispara** o alerta. Nunca usar "Não aguento mais reuniões sem agenda" como contraexemplo.
> - "Estou em baixo há semanas e não vejo saída." **não** dispara nada neste frontend. Não usar.
> - O contraexemplo que funciona é a frase do passo 5 ("…uma reunião sem agenda"): fala de reuniões e passa sem alerta.
> - O cartão indica o SNS 24 (808 24 24 24) e o 112 em caso de perigo.
> - Não colar a frase de mal-estar na pergunta da energia: aí é rejeitada como resposta inválida (não é um número de 1 a 5) antes de chegar ao filtro.

Validação, se o júri pedir: na pergunta 1, o botão "d" dá um erro a vermelho e a resposta não é gravada. Na energia, "7" dá "fora da escala".

## Plano B: a API falha ou fica lenta

- Se o GLM não responder em 25 segundos ou der erro, a app mostra sozinha a resposta de reserva, com uma nota no chat ("Esta mensagem é a resposta de reserva."), e a conversa segue.
- Para não esperar tanto: ao fim de 10 segundos, carregar em "Parar" (o botão "Enviar" muda para "Parar" enquanto o LLM escreve). Aparece a resposta de reserva e a conversa segue.
- Se o servidor arrancar sem chave, todas as mensagens são as de reserva (sem "· GLM"): a demo corre na mesma.
- Se o ecrã se estragar: "Recomeçar demo" (tem 10 segundos para "Desfazer") ou F5.
- Se nada disto resolver: "Vamos ver a gravação desta mesma conversa." Passar para o separador do vídeo de backup.
- Pedir desculpa uma vez, no máximo, e continuar o pitch ao ritmo normal.
