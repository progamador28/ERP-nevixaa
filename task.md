# Lista de Tarefas - Fase 4B: Fluxo Completo de OS e Laudos RAT Técnicos de Campo

## 1. Interface (HTML)
- `[x]` Inserir modal `modal-executar-chamado` no index.html com:
  - Form para preenchimento de serviço realizado.
  - Upload/simulação de Fotos (Antes/Depois) com visualizações premium.
  - Campos Nome e Cargo do Responsável do Hospital.
  - Canvas HTML5 interativo para desenho de assinatura digital do responsável do hospital.
- `[x]` Inserir modal `modal-detalhes-rat` no index.html (Laudo técnico executivo completo para impressão).

## 2. Estilização (CSS)
- `[x]` Criar styles para o canvas de assinatura do responsável do hospital e botões de controle (limpar assinatura).
- `[x]` Estilizar a exibição de fotos de campo e a galeria de antes/depois no laudo técnico.
- `[x]` Configurar regras de impressão `@media print` exclusivas para o novo modal de RAT técnico sob `body.print-mode-rat-novo`.

## 3. Lógica do Sistema (JavaScript)
- `[x]` Atualizar o estado global `MOCK_TICKETS` e `state.tickets` com os novos campos (dataInicio, dataFim, fotos, assinatura, etc.).
- `[x]` Desenvolver o controlador de fluxo de OS no `renderChamados()`:
  - Pendente -> Botão "Iniciar OS".
  - Em Atendimento -> Botão "Executar OS" (abre o modal de preenchimento).
  - Encerrado -> Botão "Laudo RAT" (abre tela de impressão do RAT completo).
- `[x]` Criar rotinas para capturar o desenho do canvas de assinatura com suporte a mouse e touch.
- `[x]` Implementar a submissão do formulário de conclusão salvando os dados e atualizando o status do chamado e da máquina associada.
- `[x]` Desenvolver a visualização dinâmica do laudo RAT no modal com os horários precisos de atendimento e cálculo de duração.

## 4. Testes & Homologação
- `[x]` Verificar abertura, início, execução e conclusão de chamados.
- `[x]` Testar o canvas de assinatura na tela.
- `[x]` Testar o layout de impressão do laudo RAT em folha limpa.
