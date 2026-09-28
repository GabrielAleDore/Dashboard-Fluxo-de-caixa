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
                <th style="width: 78px;">Documento</th>
                <th class="bold" style="width: 28%;">Favorecido</th>
                <th style="width: 38%;">Descrição / Histórico</th>
                <th style="width: 82px;">Vencimento</th>
                <th class="num" style="width: 105px;">Valor (R$)</th>
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
                <th style="width: 78px;">Documento</th>
                <th class="bold" style="width: 28%;">Favorecido</th>
                <th style="width: 38%;">Descrição / Histórico</th>
                <th style="width: 82px;">Vencimento</th>
                <th class="num" style="width: 105px;">Valor (R$)</th>
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

  toggleIgnore(rowId) {
    if (!rowId) return;
    State.toggleIgnored(rowId);
    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderAll();
    }
  },

  restoreIgnored(tipo) {
    State.clearIgnored(tipo);
    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderAll();
    }
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
    let badgeHtml = '📅 Todo o Período';
    if (selectedDay) {
      const [y, m, d] = selectedDay.split('-');
      const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      badgeHtml = `<span>📅 ${dayNames[dObj.getDay()]}, ${Utils.formatDateBR(dObj)}</span><button class="btn-clear-day-inline" onclick="AlertsComponent.selectDay(null)" title="Limpar seleção e exibir todos os dias">✕ Limpar</button>`;
    }

    const badgeRec = document.getElementById('badge-receber-day');
    const badgePag = document.getElementById('badge-pagar-day');
    if (badgeRec) badgeRec.innerHTML = badgeHtml;
    if (badgePag) badgePag.innerHTML = badgeHtml;

    // ── RENDER CONTAS A RECEBER ─────────────────────────────────
    const tbodyReceber = document.getElementById('table-receber-body');
    const totalRecVal  = document.getElementById('total-receber-val');
    const countRec     = document.getElementById('count-receber');

    const activeReceber = receberRows.filter(r => !State.isIgnored(r.id));
    const sumReceber = activeReceber.reduce((s, r) => s + r.entrada, 0);
    const ignoredRecCount = receberRows.length - activeReceber.length;

    if (tbodyReceber) {
      if (receberRows.length === 0) {
        const emptyMsg = selectedDay ? 'ℹ️ Nenhum recebimento para a data selecionada' : '✅ Nenhum recebimento no período';
        tbodyReceber.innerHTML = `<tr><td colspan="5" class="mov-empty">${emptyMsg}</td></tr>`;
      } else {
        tbodyReceber.innerHTML = receberRows.map(r => {
          const isIgnored = State.isIgnored(r.id);
          const rowTitle = isIgnored ? 'Movimentação inativada. Clique para reativar nos totais.' : 'Clique para ignorar esta movimentação dos totais';
          return `
            <tr class="${isIgnored ? 'mov-row-ignored' : ''}" onclick="TableComponent.toggleIgnore('${r.id}')" title="${rowTitle}">
              <td>${r.parcela || '—'}${isIgnored ? '<span class="mov-ignored-tag">Inativado</span>' : ''}</td>
              <td class="bold" title="${r.credor}">${r.credor}</td>
              <td class="historico" title="${r.historico}">${r.historico || '—'}</td>
              <td>${Utils.formatDateBR(r.vencimento)}</td>
              <td class="num green-val">${Utils.fmt(r.entrada)}</td>
            </tr>
          `;
        }).join('');
      }
    }
    if (totalRecVal) totalRecVal.textContent = Utils.fmt(sumReceber);
    if (countRec) {
      countRec.innerHTML = `${activeReceber.length} título${activeReceber.length !== 1 ? 's' : ''}` +
        (ignoredRecCount > 0 ? ` <span style="color:var(--gray);">(${ignoredRecCount} inativado${ignoredRecCount > 1 ? 's' : ''})</span><button class="btn-restore-card-ignored" onclick="event.stopPropagation(); TableComponent.restoreIgnored('receber');" title="Reativar todos os recebimentos">↺ Reativar</button>` : '');
    }

    // ── RENDER CONTAS A PAGAR ───────────────────────────────────
    const tbodyPagar = document.getElementById('table-pagar-body');
    const totalPagVal = document.getElementById('total-pagar-val');
    const countPag    = document.getElementById('count-pagar');

    const activePagar = pagarRows.filter(r => !State.isIgnored(r.id));
    const sumPagar = activePagar.reduce((s, r) => s + r.saida, 0);
    const ignoredPagCount = pagarRows.length - activePagar.length;

    if (tbodyPagar) {
      if (pagarRows.length === 0) {
        const emptyMsg = selectedDay ? 'ℹ️ Nenhum pagamento para a data selecionada' : '✅ Nenhum pagamento no período';
        tbodyPagar.innerHTML = `<tr><td colspan="5" class="mov-empty">${emptyMsg}</td></tr>`;
      } else {
        tbodyPagar.innerHTML = pagarRows.map(r => {
          const isIgnored = State.isIgnored(r.id);
          const rowTitle = isIgnored ? 'Movimentação inativada. Clique para reativar nos totais.' : 'Clique para ignorar esta movimentação dos totais';
          return `
            <tr class="${isIgnored ? 'mov-row-ignored' : ''}" onclick="TableComponent.toggleIgnore('${r.id}')" title="${rowTitle}">
              <td>${r.parcela || '—'}${isIgnored ? '<span class="mov-ignored-tag">Inativado</span>' : ''}</td>
              <td class="bold" title="${r.credor}">${r.credor}</td>
              <td class="historico" title="${r.historico}">${r.historico || '—'}</td>
              <td>${Utils.formatDateBR(r.vencimento)}</td>
              <td class="num red-val">${Utils.fmt(r.saida)}</td>
            </tr>
          `;
        }).join('');
      }
    }
    if (totalPagVal) totalPagVal.textContent = Utils.fmt(sumPagar);
    if (countPag) {
      countPag.innerHTML = `${activePagar.length} título${activePagar.length !== 1 ? 's' : ''}` +
        (ignoredPagCount > 0 ? ` <span style="color:var(--gray);">(${ignoredPagCount} inativado${ignoredPagCount > 1 ? 's' : ''})</span><button class="btn-restore-card-ignored" onclick="event.stopPropagation(); TableComponent.restoreIgnored('pagar');" title="Reativar todos os pagamentos">↺ Reativar</button>` : '');
    }
  }
};
