/**
 * CONTAS A RECEBER E CONTAS A PAGAR COMPONENT
 * Gerencia os dois cards sincronizados com a data selecionada no card de Saldos
 * Suporta inativação de linhas, reprogramação de vencimento e novos lançamentos manuais
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
          <div class="mov-card-header-actions">
            <span class="mov-badge-day" id="badge-receber-day">📅 Todo o Período</span>
            <button class="btn-new-entry" onclick="TableComponent.openNewEntryModal('receber')" title="Adicionar novo recebimento manual">
              <span>+</span> Novo Lançamento
            </button>
          </div>
        </div>
        <div class="mov-table-wrap">
          <table class="mov-table">
            <thead>
              <tr>
                <th style="width: 105px;">Documento</th>
                <th class="bold" style="width: 28%;">Favorecido</th>
                <th style="width: 36%;">Descrição / Histórico</th>
                <th style="width: 115px;">Vencimento</th>
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
          <div class="mov-card-header-actions">
            <span class="mov-badge-day" id="badge-pagar-day">📅 Todo o Período</span>
            <button class="btn-new-entry" onclick="TableComponent.openNewEntryModal('pagar')" title="Adicionar novo pagamento manual">
              <span>+</span> Novo Lançamento
            </button>
          </div>
        </div>
        <div class="mov-table-wrap">
          <table class="mov-table">
            <thead>
              <tr>
                <th style="width: 105px;">Documento</th>
                <th class="bold" style="width: 28%;">Favorecido</th>
                <th style="width: 36%;">Descrição / Histórico</th>
                <th style="width: 115px;">Vencimento</th>
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

      <!-- CONTAINER PARA OS MODAIS DINÂMICOS -->
      <div id="table-modals-container"></div>
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
      const emptyMsg = selectedDay ? 'ℹ️ Nenhum recebimento para a data selecionada' : '✅ Nenhum recebimento no período';
      const newHtml = receberRows.length === 0
        ? `<tr><td colspan="5" class="mov-empty">${emptyMsg}</td></tr>`
        : receberRows.map(r => this.renderRow(r, 'receber')).join('');
      if (tbodyReceber.innerHTML !== newHtml) {
        tbodyReceber.innerHTML = newHtml;
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
      const emptyMsg = selectedDay ? 'ℹ️ Nenhum pagamento para a data selecionada' : '✅ Nenhum pagamento no período';
      const newHtml = pagarRows.length === 0
        ? `<tr><td colspan="5" class="mov-empty">${emptyMsg}</td></tr>`
        : pagarRows.map(r => this.renderRow(r, 'pagar')).join('');
      if (tbodyPagar.innerHTML !== newHtml) {
        tbodyPagar.innerHTML = newHtml;
      }
    }
    if (totalPagVal) totalPagVal.textContent = Utils.fmt(sumPagar);
    if (countPag) {
      countPag.innerHTML = `${activePagar.length} título${activePagar.length !== 1 ? 's' : ''}` +
        (ignoredPagCount > 0 ? ` <span style="color:var(--gray);">(${ignoredPagCount} inativado${ignoredPagCount > 1 ? 's' : ''})</span><button class="btn-restore-card-ignored" onclick="event.stopPropagation(); TableComponent.restoreIgnored('pagar');" title="Reativar todos os pagamentos">↺ Reativar</button>` : '');
    }
  },

  renderRow(r, tipo) {
    const isIgnored = State.isIgnored(r.id);
    const rowTitle = isIgnored ? 'Movimentação inativada. Clique para reativar nos totais.' : 'Clique para ignorar esta movimentação dos totais';
    const isReceber = tipo === 'receber';
    const valClass = isReceber ? 'green-val' : 'red-val';
    const valAmount = isReceber ? r.entrada : r.saida;

    let reprogrammedBadge = '';
    if (r.isReprogrammed) {
      const origDateStr = r.originalVencimento ? Utils.formatDateBR(r.originalVencimento) : '';
      reprogrammedBadge = `<span class="reprogrammed-badge" title="Data original: ${origDateStr}">Reprogramado</span>`;
    }

    let manualBadge = '';
    if (r.isManual) {
      manualBadge = `<span class="manual-badge" title="Lançamento manual incluído na aplicação">Manual</span>`;
    }

    return `
      <tr class="${isIgnored ? 'mov-row-ignored' : ''}" onclick="TableComponent.toggleIgnore('${r.id}')" title="${rowTitle}">
        <td class="td-documento">
          <div class="doc-cell-content">
            <button class="btn-edit-date" onclick="event.stopPropagation(); TableComponent.openEditDateModal('${r.id}')" title="Reprogramar data de vencimento">
              ✏️
            </button>
            ${r.isManual ? `
              <button class="btn-delete-entry" onclick="event.stopPropagation(); TableComponent.confirmDeleteManualEntry('${r.id}')" title="Excluir este lançamento manual">
                🗑️
              </button>
            ` : ''}
            <span class="doc-text" title="${r.parcela}">${r.parcela || '—'}</span>
            ${isIgnored ? '<span class="mov-ignored-tag">Inativado</span>' : ''}
            ${manualBadge}
          </div>
        </td>
        <td class="bold td-favorecido" title="${r.credor}">${r.credor}</td>
        <td class="historico td-historico" title="${r.historico}">${r.historico || '—'}</td>
        <td class="td-vencimento">
          <div class="venc-cell-content">
            <span class="venc-date-text">${Utils.formatDateBR(r.vencimento)}</span>
            ${reprogrammedBadge}
          </div>
        </td>
        <td class="num ${valClass} td-valor">${Utils.fmt(valAmount)}</td>
      </tr>
    `;
  },

  // ── MODAL DE REPROGRAMAÇÃO DE DATA ───────────────────────────
  openEditDateModal(recordId) {
    const record = State.allData.find(r => r.id === recordId);
    if (!record) return;

    const modalContainer = document.getElementById('table-modals-container');
    if (!modalContainer) return;

    const currentVencStr = Utils.toInputDate(record.vencimento);
    const origVencStr = record.originalVencimento ? Utils.formatDateBR(record.originalVencimento) : Utils.formatDateBR(record.vencimento);

    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="TableComponent.closeModal(event)">
        <div class="modal-box" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>📅 Reprogramar Vencimento</h3>
            <button class="btn-modal-close" onclick="TableComponent.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-info-group">
              <label>Favorecido:</label>
              <div class="modal-static-val bold">${record.credor}</div>
            </div>
            <div class="modal-info-group">
              <label>Documento / Parcela:</label>
              <div class="modal-static-val">${record.parcela || '—'}</div>
            </div>
            <div class="modal-info-group">
              <label>Data de Vencimento Original:</label>
              <div class="modal-static-val" style="color:var(--gray);">${origVencStr}</div>
            </div>
            <div class="modal-form-group">
              <label for="edit-vencimento-input">Nova Data de Vencimento:</label>
              <input type="date" id="edit-vencimento-input" class="modal-input" value="${currentVencStr}" required />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modal-cancel" onclick="TableComponent.closeModal()">Cancelar</button>
            <button class="btn-modal-save" onclick="TableComponent.saveEditedDate('${record.id}')">💾 Salvar Alteração</button>
          </div>
        </div>
      </div>
    `;
  },

  async saveEditedDate(recordId) {
    const input = document.getElementById('edit-vencimento-input');
    if (!input || !input.value) {
      alert('Por favor, selecione uma data válida.');
      return;
    }
    const newDateStr = input.value;
    this.closeModal();

    if (typeof App !== 'undefined' && App.saveDateOverride) {
      await App.saveDateOverride(recordId, newDateStr);
    }
  },

  // ── MODAL DE NOVO LANÇAMENTO MANUAL ─────────────────────────
  openNewEntryModal(tipo = 'pagar') {
    const modalContainer = document.getElementById('table-modals-container');
    if (!modalContainer) return;

    const todayStr = Utils.toInputDate(new Date());

    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="TableComponent.closeModal(event)">
        <div class="modal-box modal-box-lg" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>➕ Novo Lançamento Manual</h3>
            <button class="btn-modal-close" onclick="TableComponent.closeModal()">✕</button>
          </div>
          <form id="form-new-entry" onsubmit="event.preventDefault(); TableComponent.submitNewEntry();">
            <div class="modal-body">
              <div class="modal-form-row">
                <div class="modal-form-group">
                  <label for="new-entry-tipo">Tipo de Operação *</label>
                  <select id="new-entry-tipo" class="modal-input" required>
                    <option value="pagar" ${tipo === 'pagar' ? 'selected' : ''}>Contas a Pagar (Saída)</option>
                    <option value="receber" ${tipo === 'receber' ? 'selected' : ''}>Contas a Receber (Entrada)</option>
                  </select>
                </div>
                <div class="modal-form-group">
                  <label for="new-entry-doc">Documento / Parcela</label>
                  <input type="text" id="new-entry-doc" class="modal-input" placeholder="Ex: NF-1234 / 01" />
                </div>
              </div>

              <div class="modal-form-row">
                <div class="modal-form-group">
                  <label for="new-entry-credor">Favorecido / Credor *</label>
                  <input type="text" id="new-entry-credor" class="modal-input" placeholder="Ex: Fornecedor de Adubos Ltda" required />
                </div>
                <div class="modal-form-group">
                  <label for="new-entry-valor">Valor (R$) *</label>
                  <div class="currency-input-wrap">
                    <span class="currency-prefix">R$</span>
                    <input type="text" inputmode="numeric" id="new-entry-valor" class="modal-input modal-input-currency" placeholder="0,00" value="0,00" required autocomplete="off" />
                  </div>
                </div>
              </div>

              <div class="modal-form-row">
                <div class="modal-form-group">
                  <label for="new-entry-venc">Data de Vencimento *</label>
                  <input type="date" id="new-entry-venc" class="modal-input" value="${todayStr}" required />
                </div>
                <div class="modal-form-group">
                  <label for="new-entry-emissao">Data de Emissão</label>
                  <input type="date" id="new-entry-emissao" class="modal-input" value="${todayStr}" />
                </div>
              </div>

              <div class="modal-form-group">
                <label for="new-entry-hist">Descrição / Histórico</label>
                <input type="text" id="new-entry-hist" class="modal-input" placeholder="Ex: Aquisição de insumos agrícolas safra 2026" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-modal-cancel" onclick="TableComponent.closeModal()">Cancelar</button>
              <button type="submit" class="btn-modal-save">💾 Adicionar Lançamento</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Aplica máscara monetária reversa (centavos para reais: 0,00 -> 0,01 -> 0,11 -> 1,11)
    const valInput = document.getElementById('new-entry-valor');
    if (valInput) {
      valInput.addEventListener('input', () => {
        const clean = valInput.value.replace(/\D/g, '');
        valInput.value = Utils.formatCentsToBRL(clean);
      });

      valInput.addEventListener('focus', () => {
        setTimeout(() => {
          const len = valInput.value.length;
          valInput.setSelectionRange(len, len);
        }, 10);
      });
    }
  },

  async submitNewEntry() {
    const tipo = document.getElementById('new-entry-tipo').value;
    const doc = document.getElementById('new-entry-doc').value;
    const credor = document.getElementById('new-entry-credor').value;
    const valorStr = document.getElementById('new-entry-valor').value;
    const valor = Utils.parseCurrencyInput(valorStr);
    const venc = document.getElementById('new-entry-venc').value;
    const emissao = document.getElementById('new-entry-emissao').value;
    const hist = document.getElementById('new-entry-hist').value;

    if (!credor || !venc || isNaN(valor) || valor <= 0) {
      alert('Por favor, informe um valor válido maior que zero e preencha todos os campos obrigatórios.');
      return;
    }

    const entryData = {
      parcela: doc || 'MANUAL',
      credor: credor.trim(),
      historico: hist ? hist.trim() : '',
      vencimento: venc,
      emissao: emissao || venc,
      entrada: tipo === 'receber' ? valor : 0,
      saida: tipo === 'pagar' ? valor : 0
    };

    this.closeModal();

    if (typeof App !== 'undefined' && App.saveManualEntry) {
      await App.saveManualEntry(entryData);
    }
  },

  // ── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE LANÇAMENTO MANUAL ─────
  confirmDeleteManualEntry(recordId) {
    const record = State.allData.find(r => r.id === recordId);
    if (!record) return;

    const modalContainer = document.getElementById('table-modals-container');
    if (!modalContainer) return;

    const isReceber = record.entrada > 0;
    const valorStr = Utils.fmt(isReceber ? record.entrada : record.saida);
    const tipoLabel = isReceber ? 'Contas a Receber (Entrada)' : 'Contas a Pagar (Saída)';
    const vencStr = Utils.formatDateBR(record.vencimento);

    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="TableComponent.closeModal(event)">
        <div class="modal-box modal-box-confirm" onclick="event.stopPropagation()">
          <div class="modal-header modal-header-danger">
            <h3>🗑️ Excluir Lançamento Manual</h3>
            <button class="btn-modal-close" onclick="TableComponent.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <p class="modal-confirm-msg">
              Deseja realmente excluir este lançamento manual?
            </p>
            <div class="modal-confirm-card">
              <div class="modal-confirm-row">
                <span class="lbl">Operação:</span>
                <strong>${tipoLabel}</strong>
              </div>
              <div class="modal-confirm-row">
                <span class="lbl">Favorecido:</span>
                <strong>${record.credor}</strong>
              </div>
              <div class="modal-confirm-row">
                <span class="lbl">Documento:</span>
                <span>${record.parcela || '—'}</span>
              </div>
              <div class="modal-confirm-row">
                <span class="lbl">Vencimento:</span>
                <span>${vencStr}</span>
              </div>
              <div class="modal-confirm-row">
                <span class="lbl">Valor:</span>
                <span class="num ${isReceber ? 'green-val' : 'red-val'}" style="font-size:15px;font-weight:700;">${valorStr}</span>
              </div>
            </div>
            <p class="modal-confirm-warning">
              ⚠️ Esta ação removerá o título permanentemente do fluxo de caixa e do Google Drive.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-modal-cancel" onclick="TableComponent.closeModal()">Cancelar</button>
            <button type="button" class="btn-modal-delete-confirm" onclick="TableComponent.executeDeleteManualEntry('${recordId}')">
              🗑️ Excluir Definitivamente
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async executeDeleteManualEntry(recordId) {
    this.closeModal();
    if (typeof App !== 'undefined' && App.deleteManualEntry) {
      await App.deleteManualEntry(recordId);
    }
  },

  closeModal(event) {
    if (event && event.target && !event.target.classList.contains('modal-overlay') && !event.target.classList.contains('btn-modal-close') && !event.target.classList.contains('btn-modal-cancel')) {
      return;
    }
    const modalContainer = document.getElementById('table-modals-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }
};
