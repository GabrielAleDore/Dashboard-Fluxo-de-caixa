/**
 * TABLE COMPONENT
 * Gerencia a tabela detalhada de lançamentos, pesquisa, paginação e visibilidade de Saldo
 */

const TableComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="table-panel">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="panel-title">
              <span class="dot" style="background:var(--blue)"></span>
              Detalhamento de Lançamentos
            </div>
            <span id="badge-individual" class="badge-individual" style="display:none">👤 Credor Individual (Apenas Caixa)</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <label class="toggle-saldo-wrap" title="Ocultar ou exibir a coluna Saldo">
              <input type="checkbox" id="toggle-hide-saldo" onchange="TableComponent.toggleSaldo(this.checked)">
              <span>Ocultar Saldo</span>
            </label>
            <input type="text" id="table-search" class="table-search" placeholder="🔍 Buscar por credor ou histórico...">
          </div>
        </div>
        <div class="table-wrap">
          <table id="detalhe-table">
            <thead>
              <tr>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th class="bold">Credor</th>
                <th>Histórico</th>
                <th class="num">Entrada (R$)</th>
                <th class="num">Saída (R$)</th>
                <th class="num col-saldo">Saldo (R$)</th>
                <th class="num">Líquido (R$)</th>
              </tr>
            </thead>
            <tbody id="table-body"></tbody>
            <tfoot>
              <tr id="table-total">
                <td colspan="4">TOTAL DO PERÍODO</td>
                <td id="foot-entrada">—</td>
                <td id="foot-saida">—</td>
                <td id="foot-saldo" class="col-saldo">—</td>
                <td id="foot-liquido">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="table-footer">
          <span id="table-info">— registros</span>
          <div class="pagination" id="pagination"></div>
        </div>
      </div>
    `;

    const searchInput = document.getElementById('table-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        State.currentPage = 1;
        this.update(State.filteredData);
      });
    }
  },

  toggleSaldo(checked) {
    State.manualHideSaldo = checked;
    this.update(State.filteredData);
  },

  update(filteredData) {
    const credorFilter = document.getElementById('credor-filter') ? document.getElementById('credor-filter').value : '';
    const isCredorSelected = !!credorFilter;
    const chk = document.getElementById('toggle-hide-saldo');
    const isCheckboxChecked = chk ? chk.checked : false;

    // Regra: se credor selecionado, oculta saldo e mostra badge
    const hideSaldo = isCredorSelected || isCheckboxChecked;

    const badge = document.getElementById('badge-individual');
    if (badge) badge.style.display = isCredorSelected ? 'inline-flex' : 'none';

    if (isCredorSelected && chk) {
      chk.checked = true;
    }

    // Ocultar cabeçalhos e células de Saldo
    document.querySelectorAll('.col-saldo').forEach(el => {
      el.style.display = hideSaldo ? 'none' : '';
    });

    const searchInput = document.getElementById('table-search');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let rows = filteredData;
    if (q) {
      rows = rows.filter(r => (r.credor && r.credor.toLowerCase().includes(q)) || (r.historico && r.historico.toLowerCase().includes(q)));
    }

    rows = [...rows].sort((a, b) => a.vencimento - b.vencimento);

    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / State.pageSize));
    if (State.currentPage > pages) State.currentPage = pages;

    const slice = rows.slice((State.currentPage - 1) * State.pageSize, State.currentPage * State.pageSize);

    // Totais de rodapé
    const totE = rows.reduce((s, r) => s + r.entrada, 0);
    const totS = rows.reduce((s, r) => s + r.saida, 0);
    const totB = rows.reduce((s, r) => s + r.saldo, 0);
    const totL = totE - totS;

    const elFootE = document.getElementById('foot-entrada');
    const elFootS = document.getElementById('foot-saida');
    const elFootB = document.getElementById('foot-saldo');
    const elFootL = document.getElementById('foot-liquido');

    if (elFootE) elFootE.textContent = Utils.fmt(totE);
    if (elFootS) elFootS.textContent = Utils.fmt(totS);
    if (elFootB) elFootB.textContent = Utils.fmt(totB);
    if (elFootL) elFootL.textContent = Utils.fmt(totL);

    // Renderizar linhas
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    slice.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.parcela || '—'}</td>
        <td class="bold">${Utils.formatDateBR(r.vencimento)}</td>
        <td class="bold" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${r.credor}">${r.credor}</td>
        <td class="historico" title="${r.historico}">${r.historico || '—'}</td>
        <td class="${r.entrada > 0 ? 'green-val' : 'num'}">${Utils.fmt(r.entrada)}</td>
        <td class="${r.saida > 0 ? 'red-val' : 'num'}">${Utils.fmt(r.saida)}</td>
        <td class="${r.saldo >= 0 ? 'green-val' : 'red-val'} col-saldo" style="${hideSaldo ? 'display:none;' : ''}">${Utils.fmt(r.saldo)}</td>
        <td class="${r.liquido >= 0 ? 'green-val' : 'red-val'}">${Utils.fmt(r.liquido)}</td>
      `;
      tbody.appendChild(tr);
    });

    const infoEl = document.getElementById('table-info');
    if (infoEl) infoEl.textContent = `Exibindo ${slice.length} de ${total} registros`;

    // Paginação
    const pag = document.getElementById('pagination');
    if (!pag) return;
    pag.innerHTML = '';

    const addBtn = (label, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (active ? ' active' : '');
      btn.textContent = label;
      btn.disabled = disabled;
      btn.onclick = () => {
        State.currentPage = page;
        TableComponent.update(State.filteredData);
      };
      pag.appendChild(btn);
    };

    addBtn('‹', State.currentPage - 1, State.currentPage === 1);
    const start = Math.max(1, State.currentPage - 2);
    const end   = Math.min(pages, start + 4);
    for (let p = start; p <= end; p++) {
      addBtn(p, p, false, p === State.currentPage);
    }
    addBtn('›', State.currentPage + 1, State.currentPage === pages);
  }
};
