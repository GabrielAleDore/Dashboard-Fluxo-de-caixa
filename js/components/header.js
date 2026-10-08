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
        <!-- ZONA SUPERIOR / PRIMÁRIA: MARCA + STATUS + BOTÃO SINCRONIZAR -->
        <div class="header-primary">
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

          <!-- CLUSTER DE SINCRONIZAÇÃO: BADGE + BOTÃO LADO A LADO -->
          <div class="sync-cluster" id="sync-cluster">
            <div class="sync-badge idle" id="sync-badge">
              <span class="sync-badge-icon">⏳</span>
              <span class="sync-badge-text">Aguardando base...</span>
            </div>
            <button class="btn-sync" id="btn-sync-drive" onclick="App.fetchDriveData(true)" title="Forçar atualização e gerar nova base do SWRural no Google Drive">
              <span class="btn-sync-icon sync-icon" id="sync-btn-icon">↻</span>
              <span class="btn-sync-label">Sincronizar</span>
            </button>
          </div>
        </div>

        <!-- ZONA DE FILTROS: EXCLUSIVAMENTE OS FILTROS -->
        <div class="header-filters" id="header-filters">
          <!-- FILTRO DE PERÍODO -->
          <div class="filter-group filter-group-date">
            <span class="filter-label">📅 Período (Vencimento)</span>
            <div class="filter-date-row">
              <div class="date-input-wrap">
                <input type="date" id="date-from" class="filter-input filter-input-date" title="Digite a data ou clique no ícone de calendário">
              </div>
              <span class="filter-sep">→</span>
              <div class="date-input-wrap">
                <input type="date" id="date-to" class="filter-input filter-input-date" title="Digite a data ou clique no ícone de calendário">
              </div>
            </div>
          </div>

          <!-- FILTRO DE CREDOR/CLIENTE PESQUISÁVEL -->
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

          <!-- ALTERNADOR DE TEMA -->
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
    this.updateSyncBadge();
  },

  updateSyncBadge() {
    const badge = document.getElementById('sync-badge');
    const syncBtn = document.getElementById('btn-sync-drive');
    const syncIcon = document.getElementById('sync-btn-icon');
    if (!badge) return;

    const meta = State.fileMetadata;
    badge.className = 'sync-badge'; // reset de classes

    if (meta.syncStatus === 'loading') {
      badge.classList.add('loading');
      const loadingMsg = meta.isForced ? 'Sincronizando com SWRural...' : 'A carregar dados do Drive...';
      badge.innerHTML = `
        <span class="sync-spinner"></span>
        <span class="sync-badge-text">${loadingMsg}</span>
      `;
      if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.classList.add('loading');
      }
      if (syncIcon) {
        syncIcon.classList.add('spinning');
      }
      return;
    }

    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.classList.remove('loading');
    }
    if (syncIcon) {
      syncIcon.classList.remove('spinning');
    }

    if (meta.syncStatus === 'error') {
      badge.classList.add('error');
      const msg = meta.errorMessage || 'Falha na conexão com o SWRural / Drive';
      badge.title = `Erro: ${msg}. Clique no botão Sincronizar para tentar novamente.`;
      badge.innerHTML = `
        <span class="sync-badge-icon">✕</span>
        <span class="sync-badge-text">Falha na Sincronização</span>
      `;
      return;
    }

    if (meta.syncStatus === 'success' && meta.lastModified) {
      const now = new Date();
      const diffMs = Math.max(0, now - meta.lastModified);
      const isOutdated = diffMs >= (60 * 60 * 1000); // Alerta se passar de 1 hora (60 min)
      const hoursLag = Math.floor(diffMs / (1000 * 60 * 60));

      const dateStr = meta.lastModified.toLocaleDateString('pt-BR');
      const timeStr = meta.lastModified.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const fileNameStr = meta.fileName || 'Arquivo SWRural';

      if (isOutdated) {
        badge.classList.add('outdated');
        const lagDetail = hoursLag >= 24 
          ? `${Math.floor(hoursLag / 24)}d atrás` 
          : hoursLag > 1 
            ? `+${hoursLag}h` 
            : `+1h`;
        badge.title = `Alerta: Base gerada há mais de 1 hora (${lagDetail}). Arquivo: ${fileNameStr}. Clique no botão Sincronizar para atualizar.`;
        badge.innerHTML = `
          <span class="sync-badge-icon">⚠️</span>
          <span class="sync-badge-text">Base Desatualizada (${lagDetail}) · ${dateStr} às ${timeStr}</span>
        `;
      } else {
        badge.classList.add('fresh');
        badge.title = `Base atualizada! Arquivo: ${fileNameStr} (Gerado em ${dateStr} às ${timeStr})`;
        badge.innerHTML = `
          <span class="sync-badge-icon">☁</span>
          <span class="sync-badge-text">Base Atualizada · ${dateStr} às ${timeStr}</span>
        `;
      }
      return;
    }

    // Estado inicial padrão
    badge.classList.add('idle');
    badge.innerHTML = `
      <span class="sync-badge-icon">⏳</span>
      <span class="sync-badge-text">Aguardando sincronização</span>
    `;
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
    const toInput = document.getElementById('date-to');
    const resetBtn = document.getElementById('btn-reset-filters');

    // Filtros de data: digitação direta via teclado e abertura do calendário exclusivamente pelo ícone nativo
    const handleDateInput = (input, isTyping = false) => {
      if (!input) return;
      const val = input.value;
      // Não dispara filtro se o valor for intermediário/incompleto (ex.: ano 0002 ao digitar 2026)
      if (!Utils.isValidDateInput(val)) {
        return;
      }
      if (State.selectedAlertFilter) {
        State.selectedAlertFilter = null;
        if (typeof AlertsComponent !== 'undefined') AlertsComponent.updateUI();
      }
      const delay = isTyping ? 350 : 50;
      App.applyFiltersDebounced(delay, input.id);
    };

    if (fromInput) {
      fromInput.addEventListener('input', () => handleDateInput(fromInput, true));
      fromInput.addEventListener('change', () => handleDateInput(fromInput, false));
    }

    if (toInput) {
      toInput.addEventListener('input', () => handleDateInput(toInput, true));
      toInput.addEventListener('change', () => handleDateInput(toInput, false));
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetCredor();
        App.resetFilters();
      });
    }

    // Eventos do Combobox Pesquisável: abre ao clicar em QUALQUER ponto
    const input = document.getElementById('credor-input');
    const inputBox = document.getElementById('combobox-input-box');
    const clearBtn = document.getElementById('credor-clear-btn');
    const wrapper = document.getElementById('combobox-credor');

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
    const wrapper = document.getElementById('combobox-credor');
    if (dropdown) dropdown.style.display = 'block';
    if (wrapper) wrapper.classList.add('open');
    this.isOpen = true;
  },

  closeDropdown() {
    const dropdown = document.getElementById('credor-dropdown');
    const wrapper = document.getElementById('combobox-credor');
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

    const input = document.getElementById('credor-input');
    const clearBtn = document.getElementById('credor-clear-btn');
    const hiddenCred = document.getElementById('credor-filter');

    if (input) input.value = value;
    if (clearBtn) clearBtn.style.display = value ? 'flex' : 'none';
    if (hiddenCred) hiddenCred.value = value;

    this.closeDropdown();
    App.applyFilters();
  },

  resetCredor() {
    State.selectedCredor = '';
    const input = document.getElementById('credor-input');
    const clearBtn = document.getElementById('credor-clear-btn');
    const hiddenCred = document.getElementById('credor-filter');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (hiddenCred) hiddenCred.value = '';
    this.closeDropdown();
  },

  setDateRange(minDate, maxDate) {
    const fromInput = document.getElementById('date-from');
    const toInput = document.getElementById('date-to');
    if (fromInput && minDate) fromInput.value = Utils.toInputDate(minDate);
    if (toInput && maxDate) toInput.value = Utils.toInputDate(maxDate);
  }
};
