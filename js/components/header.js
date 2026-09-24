/**
 * HEADER COMPONENT
 * Renderiza e gerencia o cabeçalho, logo, filtros de período e credores
 */

const HeaderComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="header">
        <div class="header-left">
          <div class="header-title">Gestão Financeira &amp; <span>Fluxo de Caixa</span></div>
          <div class="header-subtitle">Projeção de Pagamentos e Recebimentos por Vencimento</div>
        </div>
        <div class="header-controls">
          <div class="filter-group">
            <span class="filter-label">📅 Período (Vencimento)</span>
            <div class="filter-date-row">
              <input type="date" id="date-from" class="filter-input" style="min-width:130px">
              <span class="filter-sep">→</span>
              <input type="date" id="date-to" class="filter-input" style="min-width:130px">
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">🏢 Credor</span>
            <select id="credor-filter" class="filter-select" style="min-width:200px">
              <option value="">Todos os Credores</option>
            </select>
          </div>
          <div class="filter-group" style="justify-content:flex-end">
            <span class="filter-label">&nbsp;</span>
            <button class="btn-reset" id="btn-reset-filters">↺ Limpar Filtros</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    const credSel   = document.getElementById('credor-filter');
    const resetBtn  = document.getElementById('btn-reset-filters');

    if (fromInput) {
      fromInput.addEventListener('change', () => {
        State.selectedAlertFilter = null;
        if (typeof AlertsComponent !== 'undefined') AlertsComponent.updateUI();
        App.applyFilters();
      });
    }

    if (toInput) {
      toInput.addEventListener('change', () => {
        State.selectedAlertFilter = null;
        if (typeof AlertsComponent !== 'undefined') AlertsComponent.updateUI();
        App.applyFilters();
      });
    }

    if (credSel) {
      credSel.addEventListener('change', () => {
        App.applyFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        App.resetFilters();
      });
    }
  },

  populateCredores(data) {
    const credores = [...new Set(data.map(r => r.credor))].sort();
    const sel = document.getElementById('credor-filter');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Todos os Credores</option>';
    credores.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      if (c === current) o.selected = true;
      sel.appendChild(o);
    });
  },

  setDateRange(minDate, maxDate) {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    if (fromInput && minDate) fromInput.value = Utils.toInputDate(minDate);
    if (toInput && maxDate)   toInput.value   = Utils.toInputDate(maxDate);
  }
};
