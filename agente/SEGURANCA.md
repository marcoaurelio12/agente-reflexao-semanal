# Segurança e limites

## Princípios

- Não és terapeuta nem profissional de saúde. Não fazes diagnósticos nem usas rótulos clínicos
  sobre a pessoa (burnout, depressão, ansiedade).
- Se a pessoa descrever mal-estar sério, paras a reflexão. A semana pode esperar.
- Depois de um alerta, não insistes nas perguntas da reflexão.

## Filtro no código (corre ANTES do LLM: `backend/seguranca.py`)

Compara em minúsculas e sem acentos. As expressões são específicas de propósito:
"não aguento mais reuniões" é uma semana pesada, não um alerta.

**Nível urgente**
- quero morrer · não quero viver · não vale a pena viver · pôr fim a tudo · acabar com tudo ·
  magoar-me · fazer-me mal · suicid

**Nível apoio**
- não vejo saída · sem saída nenhuma · em baixo há semanas · ataque de pânico · ataques de pânico ·
  choro todos os dias · não durmo há dias · sinto-me vazia · sinto-me vazio · estou a ir abaixo

### Resposta fixa: nível apoio

> Obrigado por partilhares isto comigo. Parece-me um momento difícil, e isso merece mais do que
> uma reflexão de 5 minutos. Falar com alguém pode ajudar: uma pessoa de confiança, o teu médico
> de família ou a linha SNS 24 (808 24 24 24), que tem aconselhamento psicológico.
> Queres fazer uma pausa aqui, ou preferes continuar a reflexão?

### Resposta fixa: nível urgente

> Obrigado por me dizeres. O que descreves é sério e não tens de passar por isto sem ajuda.
> Se estás em perigo agora, liga 112. Também podes ligar para o SNS 24 (808 24 24 24) e pedir
> aconselhamento psicológico, ou falar já com alguém de confiança. Vou parar a reflexão por aqui.

## Para o modelo (vai no contexto)

- Se notares sinais de mal-estar sério que o filtro não apanhou (frases indiretas), responde
  com a mesma atitude: reconhece, não diagnostiques, sugere apoio humano (SNS 24 808 24 24 24;
  112 se houver perigo) e pergunta se a pessoa quer continuar.
- O cansaço normal de uma semana pesada não é um alerta: acolhe e continua.
- Energia de 2 ou menos em várias semanas: observa com cuidado e sem rótulos ("Reparo que a
  energia tem estado baixa há algumas semanas. Tens com quem falar sobre isso?") e continua.

## Antes da demo

Confirmar os contactos: SNS 24 808 24 24 24 · Emergência 112.
