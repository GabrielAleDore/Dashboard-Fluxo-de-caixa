/**
 * UTILS MODULE
 * Funções utilitárias de formatação, conversão e parsing
 */

const Utils = {
  // Formata valor como moeda brasileira (BRL)
  fmt(v) {
    if (v === undefined || v === null || isNaN(v)) return 'R$ 0,00';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  },

  // Formata valor compacto (K / M) para eixos de gráficos e rótulos
  fmtK(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
    if (a >= 1e3) return (v / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 'K';
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  },

  // Converte string para número (suporta formato BR 1.000,00 e formato US 1000.00)
  parseNum(s) {
    if (s === undefined || s === null || s === '') return 0;
    s = String(s).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  },

  // Converte string para Date (suporta YYYY-MM-DD e DD/MM/YYYY) com meio-dia local para neutralizar timezone
  parseDate(s) {
    if (!s) return null;
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      const [d, m, y] = s.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    return null;
  },

  // Formata objeto Date para DD/MM/YYYY
  formatDateBR(d) {
    return d ? d.toLocaleDateString('pt-BR') : '';
  },

  // Formata objeto Date para DD/MM
  formatShortDate(d) {
    return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  },

  // Converte Date para string de input date (YYYY-MM-DD) usando data local
  toInputDate(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // Converte código Hexadecimal para formato RGBA com opacidade
  hexToRgba(hex, alpha) {
    let c = (hex || '#3498DB').replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // Valida se a string é uma data válida completa para filtro (YYYY-MM-DD com ano entre 2000 e 2099, ou vazia)
  isValidDateInput(s) {
    if (!s || String(s).trim() === '') return true;
    const str = String(s).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const y = parseInt(str.slice(0, 4), 10);
    return y >= 2000 && y <= 2099;
  }
};

