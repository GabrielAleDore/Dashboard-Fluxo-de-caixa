/**
 * STATE MODULE
 * Centraliza o estado compartilhado da aplicação
 */

const State = {
  allData: [],
  filteredData: [],
  currentPage: 1,
  pageSize: 15,
  topN: 10,

  // Filtros ativos
  dateFrom: null,
  dateTo: null,
  selectedCredor: '',
  selectedAlertFilter: null, // 'vencido' | 'hoje' | '7d' | '30d' | null
  selectedDay: null,          // 'YYYY-MM-DD' | null (dia selecionado na tabela de saldos)
  manualHideSaldo: false,

  // Cores personalizáveis (persistidas no localStorage)
  chartColunasColor: localStorage.getItem('fc_colunas_color') || '#E74C3C',
  chartBarrasColor:  localStorage.getItem('fc_barras_color')  || '#F39C12',

  // Instâncias dos gráficos Chart.js
  chartColunasInstance: null,
  chartBarrasInstance: null
};
