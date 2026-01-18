# FilasDigitais

Sistema completo de filas digitais com interface minimalista no estilo Apple.

## Como usar

Basta abrir o arquivo `index.html` em qualquer navegador moderno para operar a fila. Se
algum navegador bloquear o `localStorage`, execute um servidor simples (ex.: `python -m http.server`)
e acesse via `http://localhost:8000`:

- Gere tickets com prioridade normal ou preferencial.
- Controle o atendimento em tempo real.
- Adicione novos serviços conforme a operação.
- Exporte os dados do dia em JSON.

Os dados ficam salvos no `localStorage` do navegador.
