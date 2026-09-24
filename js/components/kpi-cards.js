/**
 * KPI CARDS COMPONENT
 * Renderiza e atualiza os 4 cards de indicadores executivos
 */

const KpiCardsComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="kpi-row">
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

  update(filteredData) {
    const totalEntrada = filteredData.reduce((s, r) => s + r.entrada, 0);
    const totalSaida   = filteredData.reduce((s, r) => s + r.saida,   0);
    const resultado    = totalEntrada - totalSaida;
    const qtd          = filteredData.length;
    const qtdE         = filteredData.filter(r => r.entrada > 0).length;
    const qtdS         = filteredData.filter(r => r.saida > 0).length;

    const elEntradas     = document.getElementById('kpi-entradas');
    const elEntradasSub  = document.getElementById('kpi-entradas-sub');
    const elSaidas       = document.getElementById('kpi-saidas');
    const elSaidasSub    = document.getElementById('kpi-saidas-sub');
    const elResultado    = document.getElementById('kpi-resultado');
    const elResultadoSub = document.getElementById('kpi-resultado-sub');
    const elQtd          = document.getElementById('kpi-qtd');
    const elQtdSub       = document.getElementById('kpi-qtd-sub');

    if (elEntradas)     elEntradas.textContent     = Utils.fmt(totalEntrada);
    if (elEntradasSub)  elEntradasSub.textContent  = `${qtdE} lançamento${qtdE !== 1 ? 's' : ''}`;
    if (elSaidas)       elSaidas.textContent       = Utils.fmt(totalSaida);
    if (elSaidasSub)    elSaidasSub.textContent    = `${qtdS} lançamento${qtdS !== 1 ? 's' : ''}`;
    if (elResultado)    elResultado.textContent    = Utils.fmt(resultado);
    if (elResultadoSub) elResultadoSub.textContent = resultado >= 0 ? '▲ saldo positivo' : '▼ saldo negativo';
    if (elQtd)          elQtd.textContent          = qtd.toLocaleString('pt-BR');
    if (elQtdSub)       elQtdSub.textContent      = `títulos no período`;
  }
};
