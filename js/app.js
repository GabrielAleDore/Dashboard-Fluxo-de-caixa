/**
 * APP MODULE
 * Orquestrador principal da aplicação: inicialização, eventos de upload e coordenação de filtros
 */

const App = {
  init() {
    this.initTheme();

    if (typeof ChartDataLabels !== 'undefined') {
      Chart.register(ChartDataLabels);
    }

    // Renderiza a estrutura visual de cada componente
    HeaderComponent.render(document.getElementById('header-container'));
    KpiCardsComponent.render(document.getElementById('kpi-container'));
    ChartsComponent.render(document.getElementById('charts-container'));
    AlertsComponent.render(document.getElementById('alerts-container'));
    TableComponent.render(document.getElementById('table-container'));

    // Configura eventos de upload e arrastar/soltar
    this.setupUploadHandlers();
  },

  loadDemoData() {
    const demoCsv = `parcela;emissao;vencimento;credor;historico;moeda;entrada;saida;saldo
101/01;10/09/2026;24/09/2026;ENEL DISTRIBUICAO;Conta de Energia Matriz;BRL;0,00;1250,50;0,00
102/01;12/09/2026;24/09/2026;CLIENTE ABC LTDA;Recebimento de Fatura 445;BRL;8500,00;0,00;0,00
103/01;15/09/2026;24/09/2026;POSTO IPIRANGA;Abastecimento de Frota;BRL;0,00;620,00;0,00
104/01;15/09/2026;24/09/2026;CLIENTE DELTA SA;Serviços de Consultoria;BRL;3200,00;0,00;0,00
105/01;16/09/2026;25/09/2026;FORNECEDOR XYZ;Compra de Materiais;BRL;0,00;4300,00;0,00
106/01;18/09/2026;25/09/2026;CLIENTE ABC LTDA;Recebimento Mensalidade;BRL;5100,00;0,00;0,00
107/01;10/09/2026;26/09/2026;BANCO DO BRASIL;Taxa de Manutenção;BRL;0,00;150,00;0,00
108/01;20/09/2026;26/09/2026;MERCADO LIVRE;Equipamentos TI;BRL;0,00;890,00;0,00
109/01;21/09/2026;26/09/2026;CLIENTE VIP TECH;Projeto Customizado;BRL;12000,00;0,00;0,00`;
    const data = CsvParser.parse(demoCsv);
    this.loadData(data);
  },

  initTheme() {
    if (State.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  },

  toggleTheme() {
    State.theme = State.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('fc_theme', State.theme);
    this.initTheme();
    if (typeof HeaderComponent !== 'undefined' && HeaderComponent.updateThemeButton) {
      HeaderComponent.updateThemeButton();
    }
    if (State.filteredData && State.filteredData.length > 0) {
      ChartsComponent.update(State.filteredData);
    }
  },

  setupUploadHandlers() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        if (e.target.files && e.target.files[0]) {
          this.handleFile(e.target.files[0]);
        }
      });
    }

    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo no formato .csv');
      return;
    }

    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = '30%';

    const reader = new FileReader();
    reader.onload = e => {
      if (bar) bar.style.width = '80%';
      setTimeout(() => {
        try {
          const data = CsvParser.parse(e.target.result);
          this.loadData(data);
          if (bar) {
            bar.style.width = '100%';
            setTimeout(() => { bar.style.width = '0'; }, 500);
          }
        } catch (err) {
          alert('Erro ao processar o CSV: ' + err.message);
          if (bar) bar.style.width = '0';
        }
      }, 100);
    };
    reader.readAsText(file, 'UTF-8');
  },

  loadData(data) {
    State.allData = data;

    // Popula dropdown de credores no cabeçalho
    HeaderComponent.populateCredores(data);

    // Ajusta o intervalo padrão de datas
    const dates = data.map(r => r.vencimento).filter(Boolean).sort((a, b) => a - b);
    if (dates.length) {
      HeaderComponent.setDateRange(dates[0], dates[dates.length - 1]);
    }

    // Exibe o dashboard e oculta a tela de upload
    const uploadOverlay = document.getElementById('upload-overlay');
    const dashboardEl   = document.getElementById('dashboard');
    if (uploadOverlay) uploadOverlay.classList.add('hidden');
    if (dashboardEl)   dashboardEl.classList.add('visible');

    this.applyFilters();
  },

  applyFilters() {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    const credSel   = document.getElementById('credor-filter');

    const fromVal   = fromInput ? fromInput.value : '';
    const toVal     = toInput   ? toInput.value   : '';
    const credorVal = credSel   ? credSel.value   : '';

    const dateFrom  = fromVal ? new Date(fromVal) : null;
    const dateTo    = toVal   ? new Date(toVal)   : null;

    State.dateFrom = dateFrom;
    State.dateTo   = dateTo;
    State.selectedCredor = credorVal;

    const anchor = AlertsComponent.getAnchor(State.allData);

    State.filteredData = State.allData.filter(r => {
      // Se houver um alerta de vencimento clicado, foca especificamente nele
      if (State.selectedAlertFilter && !AlertsComponent.matchesAlert(r, State.selectedAlertFilter, anchor)) {
        return false;
      }
      // Se não houver alerta ativo, respeita o período selecionado
      if (!State.selectedAlertFilter) {
        if (dateFrom && r.vencimento < dateFrom) return false;
        if (dateTo   && r.vencimento > dateTo)   return false;
      }
      if (credorVal && r.credor !== credorVal) return false;
      return true;
    });

    State.currentPage = 1;
    this.renderAll();
  },

  resetFilters() {
    const dates = State.allData.map(r => r.vencimento).sort((a, b) => a - b);
    if (dates.length) {
      HeaderComponent.setDateRange(dates[0], dates[dates.length - 1]);
    }

    if (typeof HeaderComponent !== 'undefined' && HeaderComponent.resetCredor) {
      HeaderComponent.resetCredor();
    }
    const credSel = document.getElementById('credor-filter');
    if (credSel) credSel.value = '';

    const searchInput = document.getElementById('table-search');
    if (searchInput) searchInput.value = '';

    State.selectedAlertFilter = null;
    State.selectedDay         = null;
    State.manualHideSaldo     = false;

    const chk = document.getElementById('toggle-hide-saldo');
    if (chk) chk.checked = false;

    AlertsComponent.updateUI();
    this.applyFilters();
  },

  renderAll() {
    KpiCardsComponent.update(State.filteredData);
    ChartsComponent.update(State.filteredData);
    AlertsComponent.update(State.allData, State.selectedCredor);
    TableComponent.update(State.filteredData);
  }
};

// Inicializa a aplicação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
