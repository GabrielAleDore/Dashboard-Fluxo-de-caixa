/**
 * ALERTS & SALDOS COMPONENT
 * Gerencia as faixas de vencimento e a nova Tabela de Saldos Diários agrupados por data
 */

const AlertsComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="venc-panel">
        <!-- CABEÇALHO DO CARD -->
        <div class="venc-header">
          <div class="panel-title">
            <span class="dot" style="background:var(--amber)"></span>
            Alertas de Vencimento
          </div>
          <span class="venc-today-badge" id="venc-today-badge">📅 hoje</span>
        </div>

        <!-- BARRA DE STATUS DE FILTRO ATIVO -->
        <div class="venc-filter-bar" id="venc-filter-bar" style="display:none">
          <span>Filtrando: <strong id="venc-filter-name" style="color:var(--amber)">—</strong></span>
          <button onclick="AlertsComponent.toggleAlert(null)">✕ Limpar Filtro</button>
        </div>

        <!-- FAIXAS DE URGÊNCIA -->
        <div class="venc-bands">
          <div class="venc-band" id="band-vencido" onclick="AlertsComponent.toggleAlert('vencido')" title="Clique para filtrar apenas títulos vencidos">
            <div class="venc-band-dot" style="background:#E74C3C"></div>
            <div class="venc-band-info">
              <div class="venc-band-label" style="color:#E74C3C">🔴 Vencidos</div>
              <div class="venc-band-sub">Prazo já expirado</div>
            </div>
            <div class="venc-band-right">
              <div class="venc-band-val" style="color:#E74C3C" id="venc-val-vencido">R$ 0,00</div>
              <div class="venc-band-cnt" id="venc-cnt-vencido">0 títulos</div>
            </div>
          </div>
          <div class="venc-band" id="band-hoje" onclick="AlertsComponent.toggleAlert('hoje')" title="Clique para filtrar títulos que vencem hoje">
            <div class="venc-band-dot" style="background:#F39C12"></div>
            <div class="venc-band-info">
              <div class="venc-band-label" style="color:#F39C12">🟡 Vence Hoje</div>
              <div class="venc-band-sub" id="venc-hoje-date">—</div>
            </div>
            <div class="venc-band-right">
              <div class="venc-band-val" style="color:#F39C12" id="venc-val-hoje">R$ 0,00</div>
              <div class="venc-band-cnt" id="venc-cnt-hoje">0 títulos</div>
            </div>
          </div>
          <div class="venc-band" id="band-7d" onclick="AlertsComponent.toggleAlert('7d')" title="Clique para filtrar títulos a vencer nos próximos 7 dias">
            <div class="venc-band-dot" style="background:#3498DB"></div>
            <div class="venc-band-info">
              <div class="venc-band-label" style="color:#3498DB">🔵 Próximos 7 dias</div>
              <div class="venc-band-sub" id="venc-7d-range">—</div>
            </div>
            <div class="venc-band-right">
              <div class="venc-band-val" style="color:#3498DB" id="venc-val-7d">R$ 0,00</div>
              <div class="venc-band-cnt" id="venc-cnt-7d">0 títulos</div>
            </div>
          </div>
          <div class="venc-band" id="band-30d" onclick="AlertsComponent.toggleAlert('30d')" title="Clique para filtrar títulos a vencer nos próximos 30 dias">
            <div class="venc-band-dot" style="background:#2ECC71"></div>
            <div class="venc-band-info">
              <div class="venc-band-label" style="color:#2ECC71">🟢 Próximos 30 dias</div>
              <div class="venc-band-sub" id="venc-30d-range">—</div>
            </div>
            <div class="venc-band-right">
              <div class="venc-band-val" style="color:#2ECC71" id="venc-val-30d">R$ 0,00</div>
              <div class="venc-band-cnt" id="venc-cnt-30d">0 títulos</div>
            </div>
          </div>
        </div>

        <!-- TABELA DE SALDOS DIÁRIOS (SUBSTITUI PRÓXIMAS MOVIMENTAÇÕES) -->
        <div class="saldos-header-row">
          <div class="saldos-title">
            <span>📋 Saldos Diários por Data</span>
          </div>
          <button class="saldos-btn-reset-day" id="btn-reset-day" onclick="AlertsComponent.selectDay(null)" style="display:none;" title="Limpar seleção e exibir todos os dias">
            ✕ Limpar Seleção
          </button>
        </div>

        <div class="saldos-table-wrap">
          <table class="saldos-table" id="saldos-table">
            <thead>
              <tr>
                <th style="width:48px;">Dia</th>
                <th style="width:72px;">Data</th>
                <th class="num">Crédito</th>
                <th class="num">Débito</th>
                <th class="num">Saldo</th>
              </tr>
            </thead>
            <tbody id="saldos-table-body"></tbody>
            <tfoot>
              <tr>
                <td colspan="2">TOTAIS DO PERÍODO</td>
                <td class="num green-val" id="foot-saldos-credito">—</td>
                <td class="num red-val" id="foot-saldos-debito">—</td>
                <td class="num" id="foot-saldos-final">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  getAnchor(baseList) {
    const base = (baseList && baseList.length) ? baseList : State.allData;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dataMin = base.reduce((m, r) => r.vencimento < m ? r.vencimento : m, (base[0] && base[0].vencimento) || today);
    const anchor = today <= dataMin ? new Date(dataMin) : today;
    anchor.setHours(0, 0, 0, 0);
    return anchor;
  },

  matchesAlert(record, alertType, anchor) {
    if (!alertType) return true;
    if (record.saida <= 0) return false;
    const d7  = new Date(anchor); d7.setDate(anchor.getDate() + 7);
    const d30 = new Date(anchor); d30.setDate(anchor.getDate() + 30);

    if (alertType === 'vencido') return record.vencimento < anchor;
    if (alertType === 'hoje') return Utils.toInputDate(record.vencimento) === Utils.toInputDate(anchor);
    if (alertType === '7d') return record.vencimento > anchor && record.vencimento <= d7;
    if (alertType === '30d') return record.vencimento > d7 && record.vencimento <= d30;
    return true;
  },

  toggleAlert(type) {
    if (State.selectedAlertFilter === type || type === null) {
      State.selectedAlertFilter = null;
    } else {
      State.selectedAlertFilter = type;
    }
    this.updateUI();
    App.applyFilters();
  },

  selectDay(dateKey) {
    if (State.selectedDay === dateKey || dateKey === null) {
      State.selectedDay = null; // desmarca se clicar no mesmo ou se clicar em limpar
    } else {
      State.selectedDay = dateKey;
    }

    this.highlightSelectedDay();
    this.updateResetButton();

    if (typeof TableComponent !== 'undefined') {
      TableComponent.update(State.filteredData);
    }
  },

  updateResetButton() {
    const btnResetDay = document.getElementById('btn-reset-day');
    if (btnResetDay) {
      btnResetDay.style.display = State.selectedDay ? 'inline-flex' : 'none';
    }
  },

  highlightSelectedDay() {
    const rows = document.querySelectorAll('.saldos-table tbody tr.saldo-row');
    rows.forEach(r => {
      const rowDate = r.getAttribute('data-date');
      if (State.selectedDay && rowDate === State.selectedDay) {
        r.classList.add('selected-day-row');
      } else {
        r.classList.remove('selected-day-row');
      }
    });
  },

  updateUI() {
    const bands = ['vencido', 'hoje', '7d', '30d'];
    bands.forEach(b => {
      const el = document.getElementById('band-' + b);
      if (el) {
        if (State.selectedAlertFilter === b) {
          el.classList.add('active-filter');
        } else {
          el.classList.remove('active-filter');
        }
      }
    });

    const bar = document.getElementById('venc-filter-bar');
    const nameEl = document.getElementById('venc-filter-name');
    if (bar && nameEl) {
      if (State.selectedAlertFilter) {
        const labels = {
          vencido: '🔴 Títulos Vencidos',
          hoje:    '🟡 Vencem Hoje',
          '7d':    '🔵 Próximos 7 dias',
          '30d':   '🟢 Próximos 30 dias'
        };
        nameEl.textContent = labels[State.selectedAlertFilter] || State.selectedAlertFilter;
        bar.style.display = 'flex';
      } else {
        bar.style.display = 'none';
      }
    }
  },

  update(allData, selectedCredor) {
    const base = selectedCredor ? allData.filter(r => r.credor === selectedCredor) : allData;
    const anchor = this.getAnchor(base);
    const d7  = new Date(anchor); d7.setDate(anchor.getDate() + 7);
    const d30 = new Date(anchor); d30.setDate(anchor.getDate() + 30);

    const badge = document.getElementById('venc-today-badge');
    if (badge) {
      badge.textContent = '📅 ' + anchor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    const vencidos = base.filter(r => r.saida > 0 && r.vencimento < anchor);
    const hoje     = base.filter(r => r.saida > 0 && Utils.toInputDate(r.vencimento) === Utils.toInputDate(anchor));
    const prox7    = base.filter(r => r.saida > 0 && r.vencimento > anchor && r.vencimento <= d7);
    const prox30   = base.filter(r => r.saida > 0 && r.vencimento > d7 && r.vencimento <= d30);

    const sumSaida = arr => arr.reduce((s, r) => s + r.saida, 0);

    const setBand = (valId, cntId, data) => {
      const vEl = document.getElementById(valId);
      const cEl = document.getElementById(cntId);
      if (vEl) vEl.textContent = Utils.fmt(sumSaida(data));
      if (cEl) {
        const n = data.length;
        cEl.textContent = `${n} título${n !== 1 ? 's' : ''}`;
      }
    };

    setBand('venc-val-vencido', 'venc-cnt-vencido', vencidos);
    setBand('venc-val-hoje',    'venc-cnt-hoje',    hoje);
    setBand('venc-val-7d',      'venc-cnt-7d',      prox7);
    setBand('venc-val-30d',     'venc-cnt-30d',     prox30);

    const elHojeDate = document.getElementById('venc-hoje-date');
    const el7dRange  = document.getElementById('venc-7d-range');
    const el30dRange = document.getElementById('venc-30d-range');

    if (elHojeDate) elHojeDate.textContent = Utils.formatShortDate(anchor);
    if (el7dRange)  el7dRange.textContent  = `${Utils.formatShortDate(new Date(anchor.getTime() + 86400000))} → ${Utils.formatShortDate(d7)}`;
    if (el30dRange) el30dRange.textContent = `${Utils.formatShortDate(new Date(d7.getTime() + 86400000))} → ${Utils.formatShortDate(d30)}`;

    // ── RENDERIZAÇÃO DA TABELA DE SALDOS DIÁRIOS ───────────────────
    const saldosBody = document.getElementById('saldos-table-body');
    if (!saldosBody) return;

    // Agrupa dados filtrados por data de vencimento
    const byDate = {};
    State.filteredData.forEach(r => {
      const key = Utils.toInputDate(r.vencimento);
      if (!byDate[key]) {
        byDate[key] = {
          dateObj: r.vencimento,
          key,
          credito: 0,
          debito: 0
        };
      }
      byDate[key].credito += r.entrada;
      byDate[key].debito  += r.saida;
    });

    const sortedDates = Object.values(byDate).sort((a, b) => a.dateObj - b.dateObj);

    // Se a data selecionada anteriormente não estiver mais nos dados filtrados, reseta
    if (State.selectedDay && !sortedDates.some(d => d.key === State.selectedDay)) {
      State.selectedDay = null;
    }

    let runningSaldo = 0;
    let totalCredito = 0;
    let totalDebito  = 0;

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    saldosBody.innerHTML = '';

    if (sortedDates.length === 0) {
      saldosBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray);">Nenhum lançamento no período</td></tr>`;
    } else {
      sortedDates.forEach(d => {
        runningSaldo += (d.credito - d.debito);
        totalCredito += d.credito;
        totalDebito  += d.debito;

        const isToday = Utils.toInputDate(d.dateObj) === Utils.toInputDate(anchor);
        const dayOfWeek = isToday ? 'Hoje' : dayNames[d.dateObj.getDay()];
        const isSelected = State.selectedDay === d.key;

        const tr = document.createElement('tr');
        tr.className = `saldo-row ${isSelected ? 'selected-day-row' : ''}`;
        tr.setAttribute('data-date', d.key);
        tr.onclick = () => AlertsComponent.selectDay(d.key);

        tr.innerHTML = `
          <td class="dia-label" style="${isToday ? 'color:var(--amber);font-weight:700;' : ''}">${dayOfWeek}</td>
          <td>${Utils.formatDateBR(d.dateObj)}</td>
          <td class="num green-val">${Utils.fmt(d.credito)}</td>
          <td class="num red-val">${Utils.fmt(d.debito)}</td>
          <td class="num ${runningSaldo >= 0 ? 'green-val' : 'red-val'}">${Utils.fmt(runningSaldo)}</td>
        `;
        saldosBody.appendChild(tr);
      });
    }

    // Totais no rodapé
    const footCredito = document.getElementById('foot-saldos-credito');
    const footDebito  = document.getElementById('foot-saldos-debito');
    const footFinal   = document.getElementById('foot-saldos-final');

    if (footCredito) footCredito.textContent = Utils.fmt(totalCredito);
    if (footDebito)  footDebito.textContent  = Utils.fmt(totalDebito);
    if (footFinal) {
      footFinal.textContent = Utils.fmt(runningSaldo);
      footFinal.className   = `num ${runningSaldo >= 0 ? 'green-val' : 'red-val'}`;
    }

    const btnResetDay = document.getElementById('btn-reset-day');
    if (btnResetDay) {
      btnResetDay.style.display = State.selectedDay ? 'inline-flex' : 'none';
    }

    this.updateUI();
  }
};
