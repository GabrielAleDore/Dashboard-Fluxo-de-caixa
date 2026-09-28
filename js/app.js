/**
 * APP MODULE
 * Orquestrador principal da aplicação: inicialização automática via Google Drive e coordenação de filtros
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

    // Sincroniza a versão no rodapé
    const footerVerEl = document.getElementById('footer-version-text');
    if (footerVerEl && State.version) {
      footerVerEl.textContent = `Versão ${State.version}`;
    }

    // Inicia imediatamente buscando os dados mais recentes do Google Drive
    this.fetchDriveData();
  },

  async fetchDriveData() {
    if (!State.driveApiUrl || State.driveApiUrl.trim() === '') {
      State.fileMetadata.syncStatus = 'error';
      State.fileMetadata.errorMessage = 'A URL da API do Google Apps Script não foi configurada.';
      HeaderComponent.updateSyncBadge();
      return;
    }

    State.fileMetadata.syncStatus = 'loading';
    State.fileMetadata.errorMessage = null;
    HeaderComponent.updateSyncBadge();

    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = '35%';

    try {
      const response = await fetch(State.driveApiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Falha na requisição HTTP: ${response.status} ${response.statusText}`);
      }

      if (bar) bar.style.width = '75%';
      const json = await response.json();

      if (json.status !== 'success') {
        throw new Error(json.message || 'Erro retornado pelo Google Apps Script.');
      }

      // Validação temporal e cálculo de defasagem (dias de atraso)
      const fileDate = new Date(json.lastModified);
      const now = new Date();

      // Normaliza para início do dia (00:00:00) para contagem exata de dias
      const fileMidnight = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffMs = nowMidnight - fileMidnight;
      const daysLag = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isOutdated = daysLag > 0;

      State.fileMetadata = {
        fileName: json.fileName,
        lastModified: fileDate,
        isOutdated,
        daysLag: Math.max(0, daysLag),
        syncStatus: 'success',
        errorMessage: null
      };

      // Processa o conteúdo CSV
      const parsedData = CsvParser.parse(json.csvData);
      this.loadData(parsedData);

      if (bar) {
        bar.style.width = '100%';
        setTimeout(() => { bar.style.width = '0'; }, 500);
      }

      HeaderComponent.updateSyncBadge();

    } catch (err) {
      console.error('Erro na sincronização com Google Drive:', err);
      State.fileMetadata.syncStatus = 'error';
      State.fileMetadata.errorMessage = err.message;

      if (bar) bar.style.width = '0';
      HeaderComponent.updateSyncBadge();
    }
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

  loadData(data) {
    State.allData = data;

    // Popula dropdown de credores no cabeçalho
    HeaderComponent.populateCredores(data);

    // Ajusta o intervalo padrão de datas
    const dates = data.map(r => r.vencimento).filter(Boolean).sort((a, b) => a - b);
    if (dates.length) {
      HeaderComponent.setDateRange(dates[0], dates[dates.length - 1]);
    }

    this.applyFilters();
  },

  applyFilters() {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    const credSel   = document.getElementById('credor-filter');

    const fromVal   = fromInput ? fromInput.value : '';
    const toVal     = toInput   ? toInput.value   : '';
    const credorVal = credSel   ? credSel.value   : '';

    const dateFrom  = fromVal ? Utils.parseDate(fromVal) : null;
    if (dateFrom) dateFrom.setHours(0, 0, 0, 0);

    const dateTo    = toVal ? Utils.parseDate(toVal) : null;
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

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

    // Se o dia selecionado não constar mais nos dados filtrados, limpa
    if (State.selectedDay && !State.filteredData.some(r => Utils.toInputDate(r.vencimento) === State.selectedDay)) {
      State.selectedDay = null;
    }

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
    KpiCardsComponent.update(State.filteredData, State.selectedDay);
    ChartsComponent.update(State.filteredData);
    AlertsComponent.update(State.allData, State.selectedCredor);
    TableComponent.update(State.filteredData);
  }
};

// Inicializa a aplicação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
