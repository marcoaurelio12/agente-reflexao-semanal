# Ações sugeridas: catálogo e regras

> Lido a cada pedido. O bloco yaml é o catálogo que o servidor valida; o ficheiro inteiro
> entra no contexto da conversa livre (a seguir ao `GERAL.md`). A conversa semanal nunca o vê.

## Regras

- As ações só existem na conversa livre e num único momento: a pessoa pediu ajuda. O agente
  responde primeiro com factos do diário (com datas) e, se 1-2 ações servirem, acaba a
  mensagem com o marcador `<<ACOES:id1,id2>>` na última linha. As regras de quando oferecer
  estão na secção "Ações sugeridas" do `GERAL.md`.
- O servidor valida os ids contra este catálogo, descarta os inválidos, deduplica e trunca a
  2; o marcador é removido do texto e as ações chegam ao frontend como botões (chips).
- Clicar num botão de tipo "mensagem" envia a `mensagem` do catálogo tal como está, como se
  a pessoa a tivesse escrito; o tipo "navegacao" não envia nada (abre a reflexão da semana).
- `plano-aprendizagem` é um próximo passo pequeno sobre uma aprendizagem que já está no
  diário — nunca um programa.
- `abrir-reflexao` torna clicável o que o `GERAL.md` já manda sugerir quando a pessoa começa
  a refletir a sério.

## Catálogo

```yaml
acoes:
  - id: novo-habito
    etiqueta: Sugerir um novo hábito        # texto do chip
    tipo: mensagem
    mensagem: Sugere-me um novo hábito para a semana, a partir do que já resultou no meu diário.
  - id: plano-aprendizagem
    etiqueta: Sugerir um plano de aprendizagem
    tipo: mensagem
    mensagem: Sugere-me um plano de aprendizagem simples, a partir do que já aprendi nas últimas semanas.
  - id: rever-padroes
    etiqueta: Rever os meus padrões
    tipo: mensagem
    mensagem: Que padrões aparecem no meu diário nas últimas semanas?
  - id: abrir-reflexao
    etiqueta: Abrir a reflexão da semana
    tipo: navegacao                        # não envia mensagem; abre "Nova reflexão"
```
