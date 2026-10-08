# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico (SemVer)](https://semver.org/lang/pt-BR/).

## [2.7.0] - 2026-10-08

### Adicionado / Corrigido
- **Digitação Direta no Filtro de Período & Abertura Exclusiva pelo Ícone de Calendário**:
  - Restringida a abertura do seletor gráfico de data exclusivamente ao clique sobre o ícone nativo (`::-webkit-calendar-picker-indicator`), liberando a caixa de texto para digitação direta via teclado sem abrir o pop-up indesejado.
- **Validação de Sanidade Temporal & Prevenção de Dados Sumindo**:
  - Implementação de `Utils.isValidDateInput()`: ignora eventos emitidos durante a digitação de anos intermediários (ex.: `0002` ao digitar `2026`), mantendo a integridade visual da tela.
  - Proteção contra inversão de período (`dateFrom > dateTo`): auto-sincronização automática para evitar que as tabelas e saldos fiquem vazios durante a alteração de datas.
  - Preservação da seleção de dia ativo (`State.selectedDay`) durante transições de filtro.
- **Transição Suave & Debounce Visual**:
  - Adicionado `App.applyFiltersDebounced(300)` com micro-animação na barra superior de progresso (`#loading-bar`) e classe de transição suave `.content-updating`.
  - Atualização in-place do gráfico Chart.js (`chart.update()`) com animação fluida de 350ms em vez de destruição do canvas.
  - Estabilidade de DOM em Contas a Pagar, Contas a Receber e Saldos Diários evitando repaints bruscos.

---

## [2.6.0] - 2026-09-30

### Adicionado
- **Reprogramação de Data de Vencimento Inline com Persistência em Nuvem**:
  - Botão de ação com ícone `✏️` adicionado na primeira coluna ao lado do documento em Contas a Pagar e Contas a Receber.
  - Prevenção de conflito de clique com `event.stopPropagation()` para não disparar a inativação da linha ao clicar na edição.
  - Modal dinâmico e responsivo exibindo Favorecido, Documento, data original e seletor de nova data de vencimento.
  - Badge visual de destaque `Reprogramado` nas datas alteradas, mantendo tooltip com a data original.
- **Inserção de Novos Lançamentos Manuais**:
  - Botão `+ Novo Lançamento` integrado aos cabeçalhos das tabelas de Contas a Receber e Contas a Pagar.
  - Modal de cadastro completo: tipo (Entrada/Saída), Favorecido/Credor, Documento, Data de Vencimento, Data de Emissão, Valor e Histórico.
  - Badge visual `Manual` para identificação de movimentações criadas diretamente no dashboard.
- **Backend Colaborativo no Google Apps Script (`Code.gs`)**:
  - Criação do arquivo auxiliar `ajustes_financeiros.json` no Google Drive para persistência colaborativa sem necessidade de banco relacional.
  - `doGet(e)`: Retorna o CSV mais recente mesclado com `dateOverrides` e `manualEntries`.
  - `doPost(e)`: Suporta as ações `SAVE_DATE_OVERRIDE` e `ADD_MANUAL_ENTRY`, persistindo as alterações no Drive de forma instantânea.
- **Hash Determinístico de Transações (`js/csv-parser.js`)**:
  - Geração de identificador único via algoritmo djb2 baseado em `${parcela}|${credor}|${vencimento}|${entrada}|${saida}|${historico}` para manter os vínculos de reprogramação estáveis entre sincronizações de CSV.
- **Feedback Visual com Toast Moderno**:
  - Notificações de status de salvamento (Sucesso, Atenção, Erro) flutuantes e animadas com suporte a Dark e Light themes.

---

## [2.5.0] - 2026-09-28

### Adicionado
- **Inativação e Reativação Interativa de Movimentações (Ignorar dos Totais)**:
  - Clique direto em qualquer linha de **Contas a Pagar** ou **Contas a Receber** para inativar/ignorar o título.
  - Linha inativada recebe efeito visual imediato de **traço cinza (*line-through*)**, opacidade atenuada e tag `Inativado`.
  - Recálculo reativo em cascata: os valores inativados são expurgados de todos os agregadores (Total a Pagar/Receber, KPIs executivos de topo, Tabela de Saldos Diários e Histograma de Desembolsos).
  - Clicar novamente sobre a linha inativada a **reativa** instantaneamente, removendo o traço cinza e reintegrando os valores a todos os totais.
  - Adicionado botão de atalho `↺ Reativar` no rodapé dos cards para restauração em lote com um único clique.

---

## [2.4.1] - 2026-09-28

### Adicionado
- **Recálculo Dinâmico dos Cards de Totais Executivos (KPIs)**:
  - Os 4 cards de topo (*Total Entradas*, *Total Saídas*, *Resultado Líquido*, *Qtd. Lançamentos*) recalculam automaticamente para refletir com exatidão o montante do dia selecionado em Saldos Diários.
  - Subtítulos contextuais dinâmicos (*"X lançamentos no dia"*, *"saldo de [Dia]"*, *"títulos em DD/MM/AAAA"*).
  - Banner informativo de escopo ativo com atalho `✕ Ver Totais do Período`.
- **Destaque Interativo no Gráfico de Desembolsos**:
  - A barra do dia selecionado no gráfico de desembolsos ganha foco de destaque cromático enquanto os demais dias sofrem atenuação de opacidade (efeito *cross-filter* nativo de Power BI).
  - Clique em qualquer barra do gráfico também alterna a seleção do dia no dashboard.

---

## [2.4.0] - 2026-09-28

### Adicionado
- **Filtro Interativo por Dia (Saldos Diários ➔ Contas a Pagar e Receber)**:
  - Seleção por clique em qualquer linha da tabela **Saldos Diários por Data** (ex: Quinta-feira, Terça-feira).
  - Filtragem reativa instantânea dos cards de **Contas a Receber** e **Contas a Pagar**, exibindo exclusivamente os lançamentos de débito e crédito que compõem o saldo do dia selecionado.
  - Indicador visual ativo na linha selecionada (`● Selecionado`, borda com destaque azul e efeito glow) com suporte a toggle (clicar novamente na mesma linha desmarca o dia).
  - Botão de controle `✕ Ver Todos os Dias` no cabeçalho dos saldos diários e botões inline `✕ Limpar` nos badges de Contas a Receber e Contas a Pagar.
  - Dica de usabilidade contextual dinâmica (*"💡 Clique em um dia para detalhar"* / *"Filtro diário ativo nas contas"*).

### Corrigido
- **Normalização de Fuso Horário (Timezone GMT-3)**:
  - Eliminação de anomalia de fuso horário em `Utils.parseDate` e `Utils.toInputDate`, garantindo que datas do CSV sejam instanciadas no meio-dia local (`12:00:00`) e neutralizem saltos de dia ou divergências entre dia da semana e chave de filtro.

---

## [2.3.1] - 2026-09-28

### Modificado
- **Reestruturação e Harmonia do Cabeçalho**:
  - O botão "↻ Sincronizar" agora fica permanentemente acoplado ao lado do badge de status (`.sync-cluster`), eliminando qualquer desconexão visual.
  - Criação de layout responsivo em duas camadas (`.header-primary` e `.header-filters`) para telas de notebooks de 14" e 15" ($\le 1480\text{px}$): a linha superior preserva Marca + Alerta + Sincronizar, enquanto a linha inferior acomoda exclusivamente os filtros com espaçamento limpo.
  - Inserção do rodapé informativo com identificação institucional e badge dinâmico da versão atual.
  - Atualização dos links de cache busting para `?v=2.4`.

---

## [2.3.0] - 2026-09-28

### Adicionado
- Integração formal de versionamento semântico e documentação de lançamentos em `CHANGELOG.md`.
- Registro centralizado da versão `2.3.0` no estado da aplicação (`State.version`).

### Modificado
- Inicialização do dashboard imediata e direta: `#dashboard` exibido sem qualquer etapa intermediária de bloqueio.
- Atualização das chaves de cache busting de assets para `?v=2.3` em `index.html` e `dashboard.html`.
- Simplificação do módulo orquestrador `js/app.js` e do cabeçalho `HeaderComponent` para foco total na ingestão via Google Drive.

### Removido
- **Expurgo completo de upload manual**:
  - Removido o overlay e drop zone inicial (`#upload-overlay`, `#drop-zone`).
  - Removido o seletor de arquivos local (`#file-input`).
  - Removidos os métodos `setupUploadHandlers()`, `handleFile()` e `triggerManualUpload()` de `js/app.js`.
  - Removido o botão de contingência "📂 Manual" do cabeçalho.
  - Excluídas mais de 100 linhas de CSS morto em `css/main.css` e `css/header.css`.

---

## [2.2.0] - 2026-09-25

### Adicionado
- **Backend Serverless no Google Apps Script** (`google-apps-script/Code.gs`):
  - Função `doGet(e)` para leitura automática da base CSV mais recente a partir de uma pasta do Google Drive (`FOLDER_ID`).
  - Decodificação de arquivos em `ISO-8859-1` para preservação integral de caracteres especiais e acentuações em português.
  - Resposta JSON estruturada com tratamento de CORS e exceções.
- **Monitor de Saúde e Defasagem Temporal no Cabeçalho**:
  - Badges visuais com semântica de cores: Base Atualizada (Verde), Base Defasada (Âmbar/Laranja com cálculo de dias de atraso), Sincronizando (Azul com spinner) e Erro (Vermelho).
  - Ação sob demanda via botão "↻ Sincronizar".
- **Estado de Metadados**: criação de `State.fileMetadata` e `State.driveApiUrl`.

---

## [2.1.0] - 2026-09-25

### Adicionado
- Documento técnico detalhado de arquitetura e engenharia de software (`DOCUMENTACAO_TECNICA.md`).
- Mecanismo de cache busting via query string nos scripts e folhas de estilo (`?v=2.1`).

### Removido
- Botão e conjunto de dados fictícios de demonstração (`demoData`).

---

## [2.0.0] - 2026-09-24

### Adicionado
- **Tabela de Saldos Diários**:
  - Agrupamento das transações dia a dia por data de vencimento.
  - Cálculo contínuo de saldo acumulado (*running balance*).
  - Interação *drill-down*: ao clicar em uma data da tabela, sincroniza instantaneamente os cards de Contas a Receber e Contas a Pagar.
- **Segregação de Operações**:
  - Card superior dedicado para **Contas a Receber** (entradas em verde).
  - Card inferior dedicado para **Contas a Pagar** (saídas em vermelho).
  - Totalizadores automáticos e contadores de títulos por seção.
- **Combobox Pesquisável de Credores e Clientes**:
  - Busca em tempo real com auto-completar e navegação por teclado (`Enter`, `Escape`).
  - Fechamento inteligente ao clicar fora e botão de limpeza instantânea.
- **Identidade Institucional**:
  - Aplicação da identidade visual oficial do *Condomínio Agrícola Familiar Bachinski*.
- **Alternador de Tema (Dark / Light)**:
  - Suporte nativo a Modo Claro e Modo Escuro com persistência das preferências no `localStorage`.
- **Painel de Desembolsos Redimensionável**:
  - Layout *full-width* para o histograma de saídas e entradas por vencimento.
  - Controle de altura dinâmico via `ResizeObserver` e seletor de paleta de cores customizável.

---

## [1.1.0] - 2026-09-24

### Adicionado
- Modularização da arquitetura em componentes desacoplados (`js/components/` e `css/`).
- Responsividade completa para dispositivos móveis (smartphones e tablets).
- Cabeçalho *edge-to-edge* com alinhamento flexível.

---

## [1.0.0] - 2026-09-24

### Adicionado
- Lançamento inicial da aplicação web de Gestão Financeira e Fluxo de Caixa.
- Ingestão de bases de dados CSV com suporte a separadores vírgula e ponto-e-vírgula (`PapaParse`).
- Cards de indicadores executivos consolidados (Total Entradas, Total Saídas, Resultado Líquido e Quantidade de Títulos).
- Filtros por intervalo de datas de vencimento.
- Visualização gráfica de movimentações financeiras com Chart.js.
