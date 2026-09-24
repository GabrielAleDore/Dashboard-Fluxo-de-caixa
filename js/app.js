/**
 * APP MODULE
 * Orquestrador principal da aplicação: inicialização, eventos de upload e coordenação de filtros
 */

const App = {
  init() {
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

    const credSel = document.getElementById('credor-filter');
    if (credSel) credSel.value = '';

    const searchInput = document.getElementById('table-search');
    if (searchInput) searchInput.value = '';

    State.selectedAlertFilter = null;
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
