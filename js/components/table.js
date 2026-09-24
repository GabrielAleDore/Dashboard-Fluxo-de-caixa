/**
 * CONTAS A RECEBER E CONTAS A PAGAR COMPONENT
 * Gerencia os dois cards sincronizados com a data selecionada no card de Saldos
 * (Contas a Receber em cima, Contas a Pagar em baixo)
 */

const TableComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
      <!-- CARD 1: CONTAS A RECEBER (SUPERIOR) -->
      <div class="mov-card receber">
        <div class="mov-card-header">
          <div class="panel-title">
            <span class="dot"></span>
            <span>Contas a receber</span>
          </div>
          <span class="mov-badge-day" id="badge-receber-day">📅 Todo o Período</span>
        </div>
        <div class="mov-table-wrap">
          <table class="mov-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th class="bold">Favorecido (Cliente)</th>
                <th>Descrição / Histórico</th>
                <th>Prev. / Venc.</th>
                <th class="num">Valor (R$)</th>
              </tr>
            </thead>
            <tbody id="table-receber-body"></tbody>
          </table>
        </div>
        <div class="mov-footer">
          <span class="mov-count" id="count-receber">0 títulos</span>
          <div class="mov-total-box">
            <span class="mov-total-label">Total a Receber:</span>
            <div class="mov-total-val" id="total-receber-val">R$ 0,00</div>
          </div>
        </div>
      </div>

      <!-- CARD 2: CONTAS A PAGAR (INFERIOR) -->
      <div class="mov-card pagar">
        <div class="mov-card-header">
          <div class="panel-title">
            <span class="dot"></span>
            <span>Contas a pagar</span>
          </div>
          <span class="mov-badge-day" id="badge-pagar-day">📅 Todo o Período</span>
        </div>
        <div class="mov-table-wrap">
          <table class="mov-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th class="bold">Favorecido (Fornecedor)</th>
                <th>Descrição / Histórico</th>
                <th>Prev. / Venc.</th>
                <th class="num">Valor (R$)</th>
              </tr>
            </thead>
            <tbody id="table-pagar-body"></tbody>
          </table>
        </div>
        <div class="mov-footer">
          <span class="mov-count" id="count-pagar">0 títulos</span>
          <div class="mov-total-box">
            <span class="mov-total-label">Total a Pagar:</span>
            <div class="mov-total-val" id="total-pagar-val">R$ 0,00</div>
          </div>
        </div>
      </div>
    `;
  },

  update(filteredData) {
    const selectedDay = State.selectedDay;

    // Filtra dados para o dia selecionado (ou exibe todo o período se null)
    let receberRows = [];
    let pagarRows   = [];

    if (selectedDay) {
      receberRows = filteredData.filter(r => Utils.toInputDate(r.vencimento) === selectedDay && r.entrada > 0);
      pagarRows   = filteredData.filter(r => Utils.toInputDate(r.vencimento) === selectedDay && r.saida > 0);
    } else {
      receberRows = filteredData.filter(r => r.entrada > 0);
      pagarRows   = filteredData.filter(r => r.saida > 0);
    }

    // Ordenação por vencimento e favorecido
    receberRows.sort((a, b) => a.vencimento - b.vencimento || a.credor.localeCompare(b.credor));
    pagarRows.sort((a, b) => a.vencimento - b.vencimento || a.credor.localeCompare(b.credor));

    // Atualização de badges de data
    let badgeText = '📅 Todo o Período';
    if (selectedDay) {
      const [y, m, d] = selectedDay.split('-');
      const dObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      badgeText = `📅 ${dayNames[dObj.getDay()]}, ${Utils.formatDateBR(dObj)}`;
    }

    const badgeRec = document.getElementById('badge-receber-day');
    const badgePag = document.getElementById('badge-pagar-day');
    if (badgeRec) badgeRec.textContent = badgeText;
    if (badgePag) badgePag.textContent = badgeText;

    // ── RENDER CONTAS A RECEBER ─────────────────────────────────
    const tbodyReceber = document.getElementById('table-receber-body');
    const totalRecVal  = document.getElementById('total-receber-val');
    const countRec     = document.getElementById('count-receber');

    const sumReceber = receberRows.reduce((s, r) => s + r.entrada, 0);

    if (tbodyReceber) {
      if (receberRows.length === 0) {
        tbodyReceber.innerHTML = `<tr><td colspan="5" class="mov-empty">✅ Nenhum recebimento para a data selecionada</td></tr>`;
      } else {
        tbodyReceber.innerHTML = receberRows.map(r => `
          <tr>
            <td>${r.parcela || '—'}</td>
            <td class="bold" title="${r.credor}">${r.credor}</td>
            <td class="historico" title="${r.historico}">${r.historico || '—'}</td>
            <td>${Utils.formatDateBR(r.vencimento)}</td>
            <td class="num green-val">${Utils.fmt(r.entrada)}</td>
          </tr>
        `).join('');
      }
    }
    if (totalRecVal) totalRecVal.textContent = Utils.fmt(sumReceber);
    if (countRec)    countRec.textContent    = `${receberRows.length} título${receberRows.length !== 1 ? 's' : ''}`;

    // ── RENDER CONTAS A PAGAR ───────────────────────────────────
    const tbodyPagar = document.getElementById('table-pagar-body');
    const totalPagVal = document.getElementById('total-pagar-val');
    const countPag    = document.getElementById('count-pagar');

    const sumPagar = pagarRows.reduce((s, r) => s + r.saida, 0);

    if (tbodyPagar) {
      if (pagarRows.length === 0) {
        tbodyPagar.innerHTML = `<tr><td colspan="5" class="mov-empty">✅ Nenhum pagamento para a data selecionada</td></tr>`;
      } else {
        tbodyPagar.innerHTML = pagarRows.map(r => `
          <tr>
            <td>${r.parcela || '—'}</td>
            <td class="bold" title="${r.credor}">${r.credor}</td>
            <td class="historico" title="${r.historico}">${r.historico || '—'}</td>
            <td>${Utils.formatDateBR(r.vencimento)}</td>
            <td class="num red-val">${Utils.fmt(r.saida)}</td>
          </tr>
        `).join('');
      }
    }
    if (totalPagVal) totalPagVal.textContent = Utils.fmt(sumPagar);
    if (countPag)    countPag.textContent    = `${pagarRows.length} título${pagarRows.length !== 1 ? 's' : ''}`;
  }
};
