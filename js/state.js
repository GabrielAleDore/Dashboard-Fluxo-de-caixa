/**
 * STATE MODULE
 * Centraliza o estado compartilhado da aplicação
 */

const State = {
  version: '2.3.1',
  allData: [],
  filteredData: [],
  currentPage: 1,
  pageSize: 15,
  topN: 10,

  // Metadados de integração com o Google Drive e saúde do arquivo
  driveApiUrl: localStorage.getItem('fc_drive_api_url') || 'https://script.google.com/macros/s/AKfycbwI1zEt3-GPugPNeoSGEefcfwL3XUKWSnF9C3haeDi3sS5I8mcgRo5yNZFc2lYiZR3Bsw/exec',
  fileMetadata: {
    fileName: null,
    lastModified: null,
    isOutdated: false,
    daysLag: 0,
    syncStatus: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    errorMessage: null
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
