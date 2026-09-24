/**
 * HEADER COMPONENT
 * Renderiza e gerencia a identidade Condomínio Agrícola Familiar Bachinski, logo, filtros de período e credor pesquisável (combobox)
 */

const HeaderComponent = {
  credores: [],
  isOpen: false,

  render(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="header">
        <div class="header-left">
          <div class="brand-group">
            <span class="brand-icon" title="Condomínio Agrícola Familiar Bachinski">🌾</span>
            <div class="brand-text">
              <div class="header-title brand-agro">
                <span class="brand-condominio">Condomínio Agrícola Familiar</span>
                <span class="brand-highlight">Bachinski</span>
              </div>
              <div class="header-subtitle">Gestão Financeira &amp; Fluxo de Caixa</div>
            </div>
          </div>
        </div>
        <div class="header-controls">
          <div class="filter-group filter-group-date">
            <span class="filter-label">📅 Período (Vencimento)</span>
            <div class="filter-date-row">
              <div class="date-input-wrap">
                <input type="date" id="date-from" class="filter-input date-click-anywhere" title="Clique para escolher a data ou digite">
              </div>
              <span class="filter-sep">→</span>
              <div class="date-input-wrap">
                <input type="date" id="date-to" class="filter-input date-click-anywhere" title="Clique para escolher a data ou digite">
              </div>
            </div>
          </div>
          <div class="filter-group filter-group-credor">
            <span class="filter-label">🏢 Cliente / Credor</span>
            <div class="filter-credor-row">
              <div class="combobox-wrapper" id="combobox-credor">
                <div class="combobox-input-box" id="combobox-input-box">
                  <span class="combobox-search-icon">🔍</span>
                  <input type="text" id="credor-input" class="combobox-input" placeholder="Buscar ou selecionar..." autocomplete="off">
                  <button type="button" class="combobox-btn-clear" id="credor-clear-btn" title="Limpar seleção" style="display:none;">✕</button>
                  <span class="combobox-arrow">▾</span>
                </div>
                <input type="hidden" id="credor-filter" value="">
                <div class="combobox-dropdown" id="credor-dropdown" style="display:none;">
                  <div class="combobox-list" id="credor-dropdown-list"></div>
                </div>
              </div>
              <button class="btn-reset" id="btn-reset-filters" title="Limpar todos os filtros">↺ Limpar</button>
            </div>
          </div>
          <div class="filter-group filter-group-theme">
            <span class="filter-label">Tema</span>
            <button class="btn-theme-toggle" id="btn-theme-toggle" onclick="App.toggleTheme()" title="Alternar entre modo claro e escuro">
              <span class="theme-icon" id="theme-icon">☀️</span>
              <span class="theme-text" id="theme-text">Modo Claro</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateThemeButton();
  },

  updateThemeButton() {
    const iconEl = document.getElementById('theme-icon');
    const textEl = document.getElementById('theme-text');
    const isLight = State.theme === 'light';
    if (iconEl) iconEl.textContent = isLight ? '🌙' : '☀️';
    if (textEl) textEl.textContent = isLight ? 'Modo Escuro' : 'Modo Claro';
  },

  bindEvents() {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    const resetBtn  = document.getElementById('btn-reset-filters');

    // Filtros de data: abrir seletor visual em qualquer clique, mas permitir digitação manual
    const setupDatePicker = (input) => {
      if (!input) return;
      input.addEventListener('click', () => {
        if (typeof input.showPicker === 'function') {
          try {
            input.showPicker();
          } catch (e) {
            // Ignora se o picker nativo já estiver aberto
          }
        }
      });
    };
    setupDatePicker(fromInput);
    setupDatePicker(toInput);

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

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetCredor();
        App.resetFilters();
      });
    }

    // Eventos do Combobox Pesquisável: abre ao clicar em QUALQUER ponto
    const input      = document.getElementById('credor-input');
    const inputBox   = document.getElementById('combobox-input-box');
    const clearBtn   = document.getElementById('credor-clear-btn');
    const wrapper    = document.getElementById('combobox-credor');

    const triggerOpen = () => {
      this.openDropdown();
      this.renderDropdown(input ? input.value : '');
      if (input && document.activeElement !== input) {
        input.focus();
      }
    };

    if (inputBox) {
      inputBox.addEventListener('click', e => {
        if (e.target.id === 'credor-clear-btn') return;
        triggerOpen();
      });
    }

    if (input) {
      input.addEventListener('focus', () => {
        this.openDropdown();
        this.renderDropdown(input.value);
      });

      input.addEventListener('input', () => {
        const val = input.value;
        if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
        this.openDropdown();
        this.renderDropdown(val);
      });

      input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          this.closeDropdown();
        } else if (e.key === 'Enter') {
          const firstItem = document.querySelector('#credor-dropdown-list .combobox-item');
          if (firstItem) {
            const val = firstItem.getAttribute('data-value') || '';
            this.selectCredor(val);
          }
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.selectCredor('');
      });
    }

    // Fechar ao clicar fora
    document.addEventListener('click', e => {
      if (wrapper && !wrapper.contains(e.target)) {
        this.closeDropdown();
        if (input) {
          input.value = State.selectedCredor || '';
          if (clearBtn) clearBtn.style.display = State.selectedCredor ? 'flex' : 'none';
        }
      }
    });
  },

  openDropdown() {
    const dropdown = document.getElementById('credor-dropdown');
    const wrapper  = document.getElementById('combobox-credor');
    if (dropdown) dropdown.style.display = 'block';
    if (wrapper) wrapper.classList.add('open');
    this.isOpen = true;
  },

  closeDropdown() {
    const dropdown = document.getElementById('credor-dropdown');
    const wrapper  = document.getElementById('combobox-credor');
    if (dropdown) dropdown.style.display = 'none';
    if (wrapper) wrapper.classList.remove('open');
    this.isOpen = false;
  },

  populateCredores(data) {
    this.credores = [...new Set(data.map(r => r.credor).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    this.renderDropdown('');
  },

  renderDropdown(filterTerm = '') {
    const listEl = document.getElementById('credor-dropdown-list');
    if (!listEl) return;

    const term = (filterTerm || '').toLowerCase().trim();
    const filtered = term
      ? this.credores.filter(c => c.toLowerCase().includes(term))
      : this.credores;

    let html = `
      <div class="combobox-item all-option ${!State.selectedCredor ? 'selected' : ''}" data-value="">
        <span>🏢 Todos os Credores / Clientes</span>
        ${!State.selectedCredor ? '<span class="item-check">✓</span>' : ''}
      </div>
    `;

    if (filtered.length === 0) {
      html += `<div class="combobox-empty">Nenhum resultado encontrado para "${filterTerm}"</div>`;
    } else {
      filtered.forEach(c => {
        const isSelected = State.selectedCredor === c;
        html += `
          <div class="combobox-item ${isSelected ? 'selected' : ''}" data-value="${c}" title="${c}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c}</span>
            ${isSelected ? '<span class="item-check">✓</span>' : ''}
          </div>
        `;
      });
    }

    listEl.innerHTML = html;

    // Vincula eventos de clique nos itens do dropdown
    listEl.querySelectorAll('.combobox-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const val = item.getAttribute('data-value') || '';
        this.selectCredor(val);
      });
    });
  },

  selectCredor(value) {
    State.selectedCredor = value;

    const input      = document.getElementById('credor-input');
    const clearBtn   = document.getElementById('credor-clear-btn');
    const hiddenCred = document.getElementById('credor-filter');

    if (input) input.value = value;
    if (clearBtn) clearBtn.style.display = value ? 'flex' : 'none';
    if (hiddenCred) hiddenCred.value = value;

    this.closeDropdown();
    App.applyFilters();
  },

  resetCredor() {
    State.selectedCredor = '';
    const input      = document.getElementById('credor-input');
    const clearBtn   = document.getElementById('credor-clear-btn');
    const hiddenCred = document.getElementById('credor-filter');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (hiddenCred) hiddenCred.value = '';
    this.closeDropdown();
  },

  setDateRange(minDate, maxDate) {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    if (fromInput && minDate) fromInput.value = Utils.toInputDate(minDate);
    if (toInput && maxDate)   toInput.value   = Utils.toInputDate(maxDate);
  }
};
