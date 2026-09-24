/**
 * ALERTS COMPONENT
 * Gerencia as faixas de vencimento, filtros interativos de urgência e mini-lista
 */

const AlertsComponent = {
  render(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="venc-panel">
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

        <!-- MINI-LISTA DE TÍTULOS -->
        <div class="venc-list-title" id="venc-list-title">📋 Próximas movimentações</div>
        <div class="venc-list" id="venc-list"></div>
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

    // Mini-lista conforme alerta selecionado
    let listItems = [];
    let listTitle = '📋 Próximas movimentações';

    if (State.selectedAlertFilter === 'vencido') {
      listItems = [...vencidos].sort((a, b) => a.vencimento - b.vencimento);
      listTitle = `🔴 Títulos Vencidos (${vencidos.length})`;
    } else if (State.selectedAlertFilter === 'hoje') {
      listItems = [...hoje].sort((a, b) => a.vencimento - b.vencimento);
      listTitle = `🟡 Vencem Hoje (${hoje.length})`;
    } else if (State.selectedAlertFilter === '7d') {
      listItems = [...prox7].sort((a, b) => a.vencimento - b.vencimento);
      listTitle = `🔵 Próximos 7 dias (${prox7.length})`;
    } else if (State.selectedAlertFilter === '30d') {
      listItems = [...prox30].sort((a, b) => a.vencimento - b.vencimento);
      listTitle = `🟢 Próximos 30 dias (${prox30.length})`;
    } else {
      listItems = [...base]
        .filter(r => r.saida > 0 && r.vencimento >= anchor)
        .sort((a, b) => a.vencimento - b.vencimento)
        .slice(0, 10);
      listTitle = '📋 Próximas movimentações';
    }

    const titleEl = document.getElementById('venc-list-title');
    if (titleEl) titleEl.textContent = listTitle;

    const colorFor = r => {
      if (r.vencimento < anchor) return '#E74C3C';
      if (Utils.toInputDate(r.vencimento) === Utils.toInputDate(anchor)) return '#F39C12';
      if (r.vencimento <= d7)  return '#3498DB';
      if (r.vencimento <= d30) return '#2ECC71';
      return '#A0B0C0';
    };

    const listEl = document.getElementById('venc-list');
    if (!listEl) return;

    if (!listItems.length) {
      listEl.innerHTML = '<div class="venc-empty">✅ Sem movimentações correspondentes ao filtro</div>';
      return;
    }

    listEl.innerHTML = listItems.slice(0, 25).map(r => {
      const col = colorFor(r);
      const label = r.vencimento < anchor ? 'Vencido' :
                    Utils.toInputDate(r.vencimento) === Utils.toInputDate(anchor) ? 'Hoje' :
                    r.vencimento <= d7 ? `em ${Math.round((r.vencimento - anchor) / 86400000)}d` :
                    Utils.formatShortDate(r.vencimento);
      return `
        <div class="venc-item">
          <div class="venc-item-dot" style="background:${col}"></div>
          <div class="venc-item-info">
            <div class="venc-item-credor" title="${r.credor}">${r.credor}</div>
            <div class="venc-item-date">${Utils.formatDateBR(r.vencimento)} · ${label} · ${r.parcela || '—'}</div>
          </div>
          <div class="venc-item-val" style="color:${col}">${Utils.fmt(r.saida)}</div>
        </div>
      `;
    }).join('');

    this.updateUI();
  }
};
