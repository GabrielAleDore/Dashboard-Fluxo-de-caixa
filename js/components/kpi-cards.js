/**
 * KPI CARDS COMPONENT
 * Renderiza e atualiza os 4 cards de indicadores executivos
 */

const KpiCardsComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
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
  },

  update(filteredData, selectedDay = State.selectedDay) {
    let effectiveData = filteredData;
    let dayInfo = null;

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
    }

    const totalEntrada = effectiveData.reduce((s, r) => s + r.entrada, 0);
    const totalSaida   = effectiveData.reduce((s, r) => s + r.saida,   0);
    const resultado    = totalEntrada - totalSaida;
    const qtd          = effectiveData.length;
    const qtdE         = effectiveData.filter(r => r.entrada > 0).length;
    const qtdS         = effectiveData.filter(r => r.saida > 0).length;

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

    if (dayInfo) {
      if (elEntradasSub)  elEntradasSub.textContent  = `${qtdE} lançamento${qtdE !== 1 ? 's' : ''} no dia`;
      if (elSaidasSub)    elSaidasSub.textContent    = `${qtdS} lançamento${qtdS !== 1 ? 's' : ''} no dia`;
      if (elResultadoSub) elResultadoSub.textContent = resultado >= 0 ? `▲ saldo de ${dayInfo.shortName}` : `▼ saldo de ${dayInfo.shortName}`;
      if (elQtdSub)       elQtdSub.textContent      = `títulos em ${dayInfo.formattedDate}`;
    } else {
      if (elEntradasSub)  elEntradasSub.textContent  = `${qtdE} lançamento${qtdE !== 1 ? 's' : ''}`;
      if (elSaidasSub)    elSaidasSub.textContent    = `${qtdS} lançamento${qtdS !== 1 ? 's' : ''}`;
      if (elResultadoSub) elResultadoSub.textContent = resultado >= 0 ? '▲ saldo positivo' : '▼ saldo negativo';
      if (elQtdSub)       elQtdSub.textContent      = `títulos no período`;
    }

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
