/**
 * CHARTS COMPONENT
 * Gerencia os gráficos de Desembolsos por Vencimento e Top 10 Credores com personalização de cores
 */

const ChartsComponent = {
  render(container) {
    if (!container) return;
    const colunasCol = State.chartColunasColor || '#E74C3C';
    const barrasCol  = State.chartBarrasColor  || '#F39C12';

    container.innerHTML = `
      <div class="charts-row">
        <!-- GRÁFICO 1: DESEMBOLSOS POR VENCIMENTO -->
        <div class="chart-panel">
          <div class="chart-panel-header">
            <div class="panel-title">
              <span class="dot" id="dot-chart-colunas" style="background:${colunasCol}"></span>
              <span>Desembolsos Programados por Vencimento</span>
            </div>
            <div class="color-tools" title="Personalizar cor das Saídas">
              <span class="color-tools-label">Cor:</span>
              <button class="color-swatch ${colunasCol === '#E74C3C' ? 'active' : ''}" style="background:#E74C3C" onclick="ChartsComponent.setColunasColor('#E74C3C', this)" title="Vermelho Carmim"></button>
              <button class="color-swatch ${colunasCol === '#3498DB' ? 'active' : ''}" style="background:#3498DB" onclick="ChartsComponent.setColunasColor('#3498DB', this)" title="Azul Oceano"></button>
              <button class="color-swatch ${colunasCol === '#9B59B6' ? 'active' : ''}" style="background:#9B59B6" onclick="ChartsComponent.setColunasColor('#9B59B6', this)" title="Roxo Real"></button>
              <button class="color-swatch ${colunasCol === '#E67E22' ? 'active' : ''}" style="background:#E67E22" onclick="ChartsComponent.setColunasColor('#E67E22', this)" title="Laranja Âmbar"></button>
              <button class="color-swatch ${colunasCol === '#1ABC9C' ? 'active' : ''}" style="background:#1ABC9C" onclick="ChartsComponent.setColunasColor('#1ABC9C', this)" title="Turquesa"></button>
              <label class="color-picker-label" title="Escolher qualquer cor personalizada">
                <input type="color" id="picker-colunas" value="${colunasCol}" onchange="ChartsComponent.setColunasColor(this.value, null)">
                <span class="picker-icon">🎨</span>
              </label>
            </div>
          </div>
          <div class="chart-wrap"><canvas id="chart-colunas"></canvas></div>
        </div>

        <!-- GRÁFICO 2: TOP 10 CREDORES -->
        <div class="chart-panel">
          <div class="chart-panel-header">
            <div class="panel-title">
              <span class="dot" id="dot-chart-barras" style="background:${barrasCol}"></span>
              <span id="chart-bar-title">Top 10 Credores / Maiores Compromissos</span>
            </div>
            <div class="color-tools" title="Personalizar cor do Top Credores">
              <span class="color-tools-label">Cor:</span>
              <button class="color-swatch ${barrasCol === '#F39C12' ? 'active' : ''}" style="background:#F39C12" onclick="ChartsComponent.setBarrasColor('#F39C12', this)" title="Âmbar Ouro"></button>
              <button class="color-swatch ${barrasCol === '#E74C3C' ? 'active' : ''}" style="background:#E74C3C" onclick="ChartsComponent.setBarrasColor('#E74C3C', this)" title="Vermelho Carmim"></button>
              <button class="color-swatch ${barrasCol === '#3498DB' ? 'active' : ''}" style="background:#3498DB" onclick="ChartsComponent.setBarrasColor('#3498DB', this)" title="Azul Oceano"></button>
              <button class="color-swatch ${barrasCol === '#9B59B6' ? 'active' : ''}" style="background:#9B59B6" onclick="ChartsComponent.setBarrasColor('#9B59B6', this)" title="Roxo Real"></button>
              <button class="color-swatch ${barrasCol === '#2ECC71' ? 'active' : ''}" style="background:#2ECC71" onclick="ChartsComponent.setBarrasColor('#2ECC71', this)" title="Verde Esmeralda"></button>
              <label class="color-picker-label" title="Escolher qualquer cor personalizada">
                <input type="color" id="picker-barras" value="${barrasCol}" onchange="ChartsComponent.setBarrasColor(this.value, null)">
                <span class="picker-icon">🎨</span>
              </label>
            </div>
          </div>
          <div class="chart-wrap"><canvas id="chart-barras"></canvas></div>
        </div>
      </div>
    `;
  },

  update(filteredData) {
    this.updateColunas(filteredData);
    this.updateBarras(filteredData);
  },

  updateColunas(filteredData) {
    const byDay = {};
    filteredData.forEach(r => {
      const key = Utils.toInputDate(r.vencimento);
      if (!byDay[key]) {
        byDay[key] = { saida: 0, entrada: 0, label: Utils.formatShortDate(r.vencimento) };
      }
      byDay[key].saida   += r.saida;
      byDay[key].entrada += r.entrada;
    });

    const sorted   = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    const labels   = sorted.map(([, v]) => v.label);
    const saidas   = sorted.map(([, v]) => v.saida);
    const entradas = sorted.map(([, v]) => v.entrada);

    const canvas = document.getElementById('chart-colunas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (State.chartColunasInstance) {
      State.chartColunasInstance.destroy();
    }

    const colorSaida = State.chartColunasColor || '#E74C3C';

    State.chartColunasInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Saídas',
            data: saidas,
            backgroundColor: Utils.hexToRgba(colorSaida, 0.85),
            borderColor: colorSaida,
            borderWidth: 1,
            borderRadius: 6,
            datalabels: {
              anchor: 'end', align: 'top',
              color: '#A0B0C0', font: { size: 10, weight: '600', family: 'Inter' },
              formatter: v => v > 0 ? Utils.fmtK(v) : ''
            }
          },
          {
            label: 'Entradas',
            data: entradas,
            backgroundColor: 'rgba(46,204,113,.75)',
            borderColor: '#2ECC71',
            borderWidth: 1,
            borderRadius: 6,
            datalabels: {
              anchor: 'end', align: 'top',
              color: '#A0B0C0', font: { size: 10, weight: '600', family: 'Inter' },
              formatter: v => v > 0 ? Utils.fmtK(v) : ''
            }
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#A0B0C0', font: { size: 11, family: 'Inter' } } },
          tooltip: {
            backgroundColor: '#1E2D3D', borderColor: '#2E4A6B', borderWidth: 1,
            titleColor: '#fff', bodyColor: '#A0B0C0',
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.fmt(ctx.raw)}` }
          }
        },
        scales: {
          x: { ticks: { color: '#A0B0C0', font: { size: 11, family: 'Inter' } }, grid: { color: 'rgba(46,74,107,.4)' } },
          y: { ticks: { color: '#A0B0C0', font: { size: 10, family: 'Inter' }, callback: v => Utils.fmtK(v) }, grid: { color: 'rgba(46,74,107,.4)' } }
        }
      }
    });
  },

  updateBarras(filteredData) {
    const byCredor = {};
    filteredData.forEach(r => {
      if (!byCredor[r.credor]) byCredor[r.credor] = 0;
      byCredor[r.credor] += r.saida;
    });

    const sorted = Object.entries(byCredor).sort(([, a], [, b]) => b - a).slice(0, State.topN);
    const labels = sorted.map(([c]) => c.length > 30 ? c.slice(0, 28) + '…' : c);
    const values = sorted.map(([, v]) => v);

    const titleEl = document.getElementById('chart-bar-title');
    if (titleEl) {
      titleEl.textContent = `Top ${Math.min(State.topN, sorted.length)} Credores / Maiores Compromissos`;
    }

    const canvas = document.getElementById('chart-barras');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (State.chartBarrasInstance) {
      State.chartBarrasInstance.destroy();
    }

    const baseCol = State.chartBarrasColor || '#F39C12';

    State.chartBarrasInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map((_, i) => Utils.hexToRgba(baseCol, Math.max(0.28, 1 - (i * 0.075)))),
          borderColor: baseCol, borderWidth: 1, borderRadius: 4,
          datalabels: {
            anchor: 'end', align: 'right',
            color: '#A0B0C0', font: { size: 10, weight: '600', family: 'Inter' },
            formatter: v => Utils.fmtK(v)
          }
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        onClick: (e, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const chosenCredor = sorted[idx][0];
            const sel = document.getElementById('credor-filter');
            if (sel) {
              sel.value = chosenCredor;
              App.applyFilters();
            }
          }
        },
        onHover: (e, elements) => {
          e.native.target.style.cursor = (elements && elements.length) ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E2D3D', borderColor: '#2E4A6B', borderWidth: 1,
            titleColor: '#fff', bodyColor: '#A0B0C0',
            callbacks: { label: ctx => ` ${Utils.fmt(ctx.raw)} (clique para filtrar)` }
          }
        },
        scales: {
          x: { ticks: { color: '#A0B0C0', font: { size: 10, family: 'Inter' }, callback: v => Utils.fmtK(v) }, grid: { color: 'rgba(46,74,107,.4)' } },
          y: { ticks: { color: '#fff', font: { size: 11, family: 'Inter' } }, grid: { display: false } }
        }
      }
    });
  },

  setColunasColor(color, btnEl) {
    State.chartColunasColor = color;
    localStorage.setItem('fc_colunas_color', color);
    const dot = document.getElementById('dot-chart-colunas');
    if (dot) dot.style.background = color;
    const picker = document.getElementById('picker-colunas');
    if (picker) picker.value = color;

    if (dot) {
      const panel = dot.closest('.chart-panel');
      if (panel) {
        panel.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
      }
    }
    this.updateColunas(State.filteredData);
  },

  setBarrasColor(color, btnEl) {
    State.chartBarrasColor = color;
    localStorage.setItem('fc_barras_color', color);
    const dot = document.getElementById('dot-chart-barras');
    if (dot) dot.style.background = color;
    const picker = document.getElementById('picker-barras');
    if (picker) picker.value = color;

    if (dot) {
      const panel = dot.closest('.chart-panel');
      if (panel) {
        panel.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
      }
    }
    this.updateBarras(State.filteredData);
  }
};
