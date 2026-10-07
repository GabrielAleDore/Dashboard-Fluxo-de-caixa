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
    // 1. Trava de execução contra cliques concorrentes
    if (State.fileMetadata && State.fileMetadata.syncStatus === 'loading') {
      return;
    }

    const syncBtn = document.getElementById('btn-sync-drive');
    const bar = document.getElementById('loading-bar');

    if (!State.driveApiUrl || State.driveApiUrl.trim() === '') {
      State.fileMetadata.syncStatus = 'error';
      State.fileMetadata.errorMessage = 'A URL da API do Google Apps Script não foi configurada.';
      HeaderComponent.updateSyncBadge();
      return;
    }

    // Desativa temporariamente o elemento do botão e define cursor de espera
    if (syncBtn) syncBtn.disabled = true;
    document.body.style.cursor = 'wait';

    State.fileMetadata.syncStatus = 'loading';
    State.fileMetadata.errorMessage = null;
    HeaderComponent.updateSyncBadge();

    // Barra de progresso para 30% no início da requisição
    if (bar) bar.style.width = '30%';

    try {
      const response = await fetch(State.driveApiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Falha na requisição HTTP: ${response.status} ${response.statusText}`);
      }

      // 70% na receção do JSON
      if (bar) bar.style.width = '70%';
      const json = await response.json();

      if (json.status !== 'success') {
        throw new Error(json.message || 'Erro retornado pelo Google Apps Script / SWRural.');
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

      // Ingestão dos ajustes persistidos na nuvem
      State.dateOverrides = json.dateOverrides || {};
      State.manualEntries = json.manualEntries || [];

      // Processa o conteúdo CSV base
      const parsedCsvData = CsvParser.parse(json.csvData);

      // Aplica as datas reprogramadas aos registros do CSV
      parsedCsvData.forEach(row => {
        if (State.dateOverrides[row.id]) {
          const overriddenDate = Utils.parseDate(State.dateOverrides[row.id]);
          if (overriddenDate) {
            row.vencimento = overriddenDate;
            row.isReprogrammed = true;
          }
        }
      });

      // Normaliza e anexa os lançamentos manuais
      const manualParsed = State.manualEntries.map(m => {
        const venc = State.dateOverrides[m.id] ? Utils.parseDate(State.dateOverrides[m.id]) : Utils.parseDate(m.vencimento);
        const emissao = m.emissao ? Utils.parseDate(m.emissao) : new Date();
        return {
          id: m.id,
          parcela: m.parcela || 'MANUAL',
          emissao,
          originalVencimento: Utils.parseDate(m.vencimento),
          vencimento: venc,
          credor: m.credor || '',
          historico: m.historico || '',
          entrada: Number(m.entrada) || 0,
          saida: Number(m.saida) || 0,
          saldo: Number(m.saldo) || 0,
          liquido: (Number(m.entrada) || 0) - (Number(m.saida) || 0),
          isReprogrammed: !!State.dateOverrides[m.id],
          isManual: true
        };
      });

      const combinedData = [...parsedCsvData, ...manualParsed];
      this.loadData(combinedData);

      // 100% após o parsing e re-renderização completa
      if (bar) {
        bar.style.width = '100%';
        setTimeout(() => { bar.style.width = '0'; }, 500);
      }

      HeaderComponent.updateSyncBadge();

    } catch (err) {
      console.error('Erro na sincronização com Google Drive / SWRural:', err);
      State.fileMetadata.syncStatus = 'error';
      State.fileMetadata.errorMessage = err.message;

      if (bar) bar.style.width = '0';
      HeaderComponent.updateSyncBadge();
    } finally {
      // Reativa o botão de sincronização e repõe o cursor normal
      if (syncBtn) {
        syncBtn.disabled = false;
      }
      document.body.style.cursor = 'default';
    }
  },

  /**
   * Salva a reprogramação da data de vencimento no Google Drive e atualiza o estado local
   */
  async saveDateOverride(recordId, newDateStr) {
    if (!recordId || !newDateStr) return false;

    // Atualiza imediatamente em memória para feedback instantâneo
    const newDate = Utils.parseDate(newDateStr);
    if (!newDate) {
      this.showToast('Data informada é inválida.', 'error');
      return false;
    }

    const record = State.allData.find(r => r.id === recordId);
    if (record) {
      record.vencimento = newDate;
      record.isReprogrammed = true;
    }
    State.dateOverrides[recordId] = newDateStr;

    this.applyFilters();
    this.showToast('Salvando reprogramação na nuvem...', 'info');

    // Persiste no Google Apps Script de forma assíncrona
    try {
      const response = await fetch(State.driveApiUrl, {
        method: 'POST',
        // Evita CORS preflight usando text/plain
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SAVE_DATE_OVERRIDE',
          payload: {
            id: recordId,
            newDate: newDateStr
          }
        }),
        redirect: 'follow'
      });

      const result = await response.json();
      if (result.status === 'success') {
        this.showToast('Data reprogramada e salva no Drive com sucesso!', 'success');
        return true;
      } else {
        throw new Error(result.message || 'Erro retornado pela API.');
      }
    } catch (err) {
      console.error('Erro ao salvar reprogramação de data no Google Drive:', err);
      this.showToast('Reprogramado em memória, mas houve falha ao salvar na nuvem: ' + err.message, 'warning');
      return false;
    }
  },

  /**
   * Salva um novo lançamento manual no Google Drive e atualiza o estado local
   */
  async saveManualEntry(entryData) {
    if (!entryData || !entryData.vencimento) return false;

    const id = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const vencimentoDate = Utils.parseDate(entryData.vencimento);
    const emissaoDate = entryData.emissao ? Utils.parseDate(entryData.emissao) : new Date();

    const normalizedEntry = {
      id,
      parcela: entryData.parcela || 'MANUAL',
      emissao: emissaoDate,
      originalVencimento: vencimentoDate,
      vencimento: vencimentoDate,
      credor: entryData.credor || 'Sem favorecido',
      historico: entryData.historico || '',
      entrada: Number(entryData.entrada) || 0,
      saida: Number(entryData.saida) || 0,
      saldo: 0,
      liquido: (Number(entryData.entrada) || 0) - (Number(entryData.saida) || 0),
      isReprogrammed: false,
      isManual: true
    };

    // Atualização otimista em memória
    State.allData.push(normalizedEntry);
    this.loadData(State.allData);
    this.showToast('Salvando novo lançamento na nuvem...', 'info');

    // Objeto pronto para o payload JSON do backend
    const payloadBackend = {
      id,
      parcela: normalizedEntry.parcela,
      emissao: Utils.toInputDate(emissaoDate),
      vencimento: Utils.toInputDate(vencimentoDate),
      credor: normalizedEntry.credor,
      historico: normalizedEntry.historico,
      entrada: normalizedEntry.entrada,
      saida: normalizedEntry.saida,
      saldo: 0,
      liquido: normalizedEntry.liquido,
      isManual: true
    };

    try {
      const response = await fetch(State.driveApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ADD_MANUAL_ENTRY',
          payload: payloadBackend
        }),
        redirect: 'follow'
      });

      const result = await response.json();
      if (result.status === 'success') {
        State.manualEntries.push(payloadBackend);
        this.showToast('Lançamento salvo com sucesso no Google Drive!', 'success');
        return true;
      } else {
        throw new Error(result.message || 'Erro retornado pela API.');
      }
    } catch (err) {
      console.error('Erro ao salvar lançamento manual no Google Drive:', err);
      this.showToast('Lançamento adicionado na sessão, mas falhou ao persistir na nuvem: ' + err.message, 'warning');
      return false;
    }
  },

  /**
   * Sistema de feedback visual com Toast moderno
   */
  showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, 4000);
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
    const toInput = document.getElementById('date-to');
    const credSel = document.getElementById('credor-filter');

    const fromVal = fromInput ? fromInput.value : '';
    const toVal = toInput ? toInput.value : '';
    const credorVal = credSel ? credSel.value : '';

    const dateFrom = fromVal ? Utils.parseDate(fromVal) : null;
    if (dateFrom) dateFrom.setHours(0, 0, 0, 0);

    const dateTo = toVal ? Utils.parseDate(toVal) : null;
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    State.dateFrom = dateFrom;
    State.dateTo = dateTo;
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
        if (dateTo && r.vencimento > dateTo) return false;
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
    State.selectedDay = null;
    State.clearIgnored();
    State.manualHideSaldo = false;

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
