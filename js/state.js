/**
 * STATE MODULE
 * Centraliza o estado compartilhado da aplicação
 */

const State = {
  version: '2.6.0',
  allData: [],
  filteredData: [],
  currentPage: 1,
  pageSize: 15,
  topN: 10,

  // Visão dos cards de KPI: 'previsao' (todos do período) ou 'atual' (vencidos até hoje)
  kpiViewMode: localStorage.getItem('fc_kpi_view_mode') || 'previsao', // 'atual' | 'previsao'

  // Metadados de integração com o Google Drive e saúde do arquivo
  driveApiUrl: localStorage.getItem('fc_drive_api_url') || 'https://script.google.com/macros/s/AKfycbwTWMJFGiqnyUe-ZMTVihRsuhwyO4UzXt1LyHHkFvPRsQVJqqBiyfTMx-losKUDmjFCVQ/exec',
  fileMetadata: {
    fileName: null,
    lastModified: null,
    isOutdated: false,
    daysLag: 0,
    syncStatus: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    errorMessage: null
  },

  // Ajustes persistidos colaborativamente no Google Drive
  dateOverrides: {},   // { [recordId: string]: 'YYYY-MM-DD' }
  manualEntries: [],   // Array de novos lançamentos manuais

  // Movimentações inativadas/ignoradas manualmente pelo usuário na sessão
  ignoredMovementIds: new Set(),

  isIgnored(id) {
    return this.ignoredMovementIds.has(id);
  },

  toggleIgnored(id) {
    if (this.ignoredMovementIds.has(id)) {
      this.ignoredMovementIds.delete(id);
    } else {
      this.ignoredMovementIds.add(id);
    }
  },

  clearIgnored(tipo = null) {
    if (!tipo) {
      this.ignoredMovementIds.clear();
      return;
    }
    this.allData.forEach(r => {
      if (tipo === 'receber' && r.entrada > 0) this.ignoredMovementIds.delete(r.id);
      if (tipo === 'pagar' && r.saida > 0) this.ignoredMovementIds.delete(r.id);
    });
  },

  getActiveData(records) {
    if (!records) return [];
    if (this.ignoredMovementIds.size === 0) return records;
    return records.filter(r => !this.ignoredMovementIds.has(r.id));
  },

  // Filtros ativos
  dateFrom: null,
  dateTo: null,
  selectedCredor: '',
  selectedAlertFilter: null, // 'vencido' | 'hoje' | '7d' | '30d' | null
  selectedDay: null,          // 'YYYY-MM-DD' | null (dia selecionado na tabela de saldos)
  manualHideSaldo: false,

  // Cores personalizáveis e tema (persistidos no localStorage)
  theme: localStorage.getItem('fc_theme') || 'dark', // 'dark' | 'light'
  chartColunasColor: localStorage.getItem('fc_colunas_color') || '#E74C3C',
  chartBarrasColor: localStorage.getItem('fc_barras_color') || '#F39C12',

  // Instâncias dos gráficos Chart.js
  chartColunasInstance: null,
  chartBarrasInstance: null
};
