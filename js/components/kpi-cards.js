/**
 * KPI CARDS COMPONENT
 * Renderiza e atualiza os 4 cards de indicadores executivos
 */

const KpiCardsComponent = {
  render(container) {
    if (!container) return;
    const mode = (typeof State !== 'undefined' && State.kpiViewMode) ? State.kpiViewMode : 'previsao';

    container.innerHTML = `
      <!-- CABEÇALHO DO BLOCO DE KPIS COM SELETOR EM PÍLULA -->
      <div class="kpi-header-row">
        <div class="kpi-header-title">
          <span class="kpi-title-icon">📊</span>
          <span>Indicadores Executivos</span>
        </div>
        <div class="kpi-view-toggle" id="kpi-view-toggle" role="group" aria-label="Modo de visualização dos indicadores">
          <button type="button" class="kpi-toggle-btn ${mode === 'atual' ? 'active' : ''}" data-mode="atual" title="Calcular exclusivamente títulos com vencimento até hoje">
            ⏱️ Atual
          </button>
          <button type="button" class="kpi-toggle-btn ${mode === 'previsao' ? 'active' : ''}" data-mode="previsao" title="Calcular todos os lançamentos do período selecionado (inclusive datas futuras)">
            📈 Previsão
          </button>
        </div>
      </div>

      <!-- BANNER DE ESCOPO DIÁRIO ATIVO -->
      <div class="kpi-scope-bar" id="kpi-scope-bar" style="display:none;">
        <div class="kpi-scope-info">
          <span class="kpi-scope-icon">📅</span>
          <span>Exibindo totais de: <strong id="kpi-scope-day-text">—</strong></span>
        </div>
        <button class="kpi-btn-clear-scope" onclick="AlertsComponent.selectDay(null)" title="Limpar filtro diário e exibir totais consolidados do período">
          ✕ Ver Totais do Período
        </button>
      </div>

      <div class="kpi-row" id="kpi-row-cards">
        <div class="kpi-card green">
          <div class="kpi-icon">↑</div>
          <div class="kpi-label">Total Entradas</div>
          <div class="kpi-value" id="kpi-entradas">R$ 0,00</div>
          <div class="kpi-sub" id="kpi-entradas-sub">— lançamentos</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-icon">↓</div>
          <div class="kpi-label">Total Saídas</div>
          <div class="kpi-value" id="kpi-saidas">R$ 0,00</div>
          <div class="kpi-sub" id="kpi-saidas-sub">— lançamentos</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-icon">⇄</div>
          <div class="kpi-label">Resultado Líquido</div>
          <div class="kpi-value" id="kpi-resultado">R$ 0,00</div>
          <div class="kpi-sub" id="kpi-resultado-sub">saldo do período</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-icon">📋</div>
          <div class="kpi-label">Qtd. Lançamentos</div>
          <div class="kpi-value" id="kpi-qtd">0</div>
          <div class="kpi-sub" id="kpi-qtd-sub">títulos no período</div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const toggleContainer = document.getElementById('kpi-view-toggle');
    if (!toggleContainer) return;

    toggleContainer.querySelectorAll('.kpi-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetMode = btn.getAttribute('data-mode');
        if (targetMode) {
          this.setViewMode(targetMode);
        }
      });
    });
  },

  setViewMode(mode) {
    if (mode !== 'atual' && mode !== 'previsao') return;
    State.kpiViewMode = mode;
    localStorage.setItem('fc_kpi_view_mode', mode);
    this.updateToggleUI();
    this.update(State.filteredData, State.selectedDay);
  },

  updateToggleUI() {
    const btns = document.querySelectorAll('.kpi-view-toggle .kpi-toggle-btn');
    btns.forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      if (mode === State.kpiViewMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  update(filteredData, selectedDay = State.selectedDay) {
    let effectiveData = filteredData;
    let dayInfo = null;

    // Regra de Compatibilidade: Se houver filtro por dia específico ativo, tem precedência
    if (selectedDay) {
      effectiveData = filteredData.filter(r => Utils.toInputDate(r.vencimento) === selectedDay);
      const [y, m, d] = selectedDay.split('-');
      const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      dayInfo = {
        name: dayNames[dObj.getDay()],
        shortName: dayNames[dObj.getDay()].replace('-feira', ''),
        formattedDate: Utils.formatDateBR(dObj)
      };
    } else if (State.kpiViewMode === 'atual') {
      // Modo "Atual": exclusivamente títulos cujo vencimento seja menor ou igual à data de hoje (<= 23:59:59)
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      effectiveData = filteredData.filter(r => r.vencimento && r.vencimento <= endOfToday);
    }

    const activeData = State.getActiveData(effectiveData);
    const ignoredCount = effectiveData.length - activeData.length;

    const totalEntrada = activeData.reduce((s, r) => s + r.entrada, 0);
    const totalSaida   = activeData.reduce((s, r) => s + r.saida,   0);
    const resultado    = totalEntrada - totalSaida;
    const qtd          = activeData.length;
    const qtdE         = activeData.filter(r => r.entrada > 0).length;
    const qtdS         = activeData.filter(r => r.saida > 0).length;

    const elEntradas     = document.getElementById('kpi-entradas');
    const elEntradasSub  = document.getElementById('kpi-entradas-sub');
    const elSaidas       = document.getElementById('kpi-saidas');
    const elSaidasSub    = document.getElementById('kpi-saidas-sub');
    const elResultado    = document.getElementById('kpi-resultado');
    const elResultadoSub = document.getElementById('kpi-resultado-sub');
    const elQtd          = document.getElementById('kpi-qtd');
    const elQtdSub       = document.getElementById('kpi-qtd-sub');

    if (elEntradas)     elEntradas.textContent     = Utils.fmt(totalEntrada);
    if (elSaidas)       elSaidas.textContent       = Utils.fmt(totalSaida);
    if (elResultado)    elResultado.textContent    = Utils.fmt(resultado);
    if (elQtd)          elQtd.textContent          = qtd.toLocaleString('pt-BR');

    const todayStr = Utils.formatDateBR(new Date());

    if (dayInfo) {
      if (elEntradasSub)  elEntradasSub.textContent  = `${qtdE} lançamento${qtdE !== 1 ? 's' : ''} no dia`;
      if (elSaidasSub)    elSaidasSub.textContent    = `${qtdS} lançamento${qtdS !== 1 ? 's' : ''} no dia`;
      if (elResultadoSub) elResultadoSub.textContent = resultado >= 0 ? `▲ saldo de ${dayInfo.shortName}` : `▼ saldo de ${dayInfo.shortName}`;
      if (elQtdSub)       elQtdSub.textContent      = `títulos em ${dayInfo.formattedDate}` + (ignoredCount > 0 ? ` (${ignoredCount} inativado${ignoredCount > 1 ? 's' : ''})` : '');
    } else if (State.kpiViewMode === 'atual') {
      if (elEntradasSub)  elEntradasSub.textContent  = `${qtdE} lançamento${qtdE !== 1 ? 's' : ''} até hoje`;
      if (elSaidasSub)    elSaidasSub.textContent    = `${qtdS} vencido${qtdS !== 1 ? 's' : ''} até hoje`;
      if (elResultadoSub) elResultadoSub.textContent = resultado >= 0 ? `▲ saldo até hoje (${todayStr})` : `▼ saldo até hoje (${todayStr})`;
      if (elQtdSub)       elQtdSub.textContent      = `vencidos até hoje (${todayStr})` + (ignoredCount > 0 ? ` (${ignoredCount} inativado${ignoredCount > 1 ? 's' : ''})` : '');
    } else {
      if (elEntradasSub)  elEntradasSub.textContent  = `${qtdE} lançamento${qtdE !== 1 ? 's' : ''} (previsão)`;
      if (elSaidasSub)    elSaidasSub.textContent    = `${qtdS} lançamento${qtdS !== 1 ? 's' : ''} (previsão)`;
      if (elResultadoSub) elResultadoSub.textContent = resultado >= 0 ? '▲ saldo previsto no período' : '▼ saldo previsto no período';
      if (elQtdSub)       elQtdSub.textContent      = `títulos no período` + (ignoredCount > 0 ? ` (${ignoredCount} inativado${ignoredCount > 1 ? 's' : ''})` : '');
    }

    // Sincroniza o estado visual dos botões do seletor
    this.updateToggleUI();

    // Atualização do banner de escopo ativo
    const scopeBar = document.getElementById('kpi-scope-bar');
    const scopeDayText = document.getElementById('kpi-scope-day-text');
    const cardsRow = document.getElementById('kpi-row-cards');

    if (scopeBar && scopeDayText) {
      if (dayInfo) {
        scopeDayText.textContent = `${dayInfo.name}, ${dayInfo.formattedDate}`;
        scopeBar.style.display = 'flex';
        if (cardsRow) cardsRow.classList.add('day-scoped');
      } else {
        scopeBar.style.display = 'none';
        if (cardsRow) cardsRow.classList.remove('day-scoped');
      }
    }
  }
};
