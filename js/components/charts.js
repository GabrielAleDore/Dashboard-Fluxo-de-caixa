/**
 * CHARTS COMPONENT
 * Gerencia o gráfico de Desembolsos Programados por Vencimento em largura total com ajuste de altura vertical
 */

const ChartsComponent = {
  resizeObserver: null,

  render(container) {
    if (!container) return;
    const colunasCol = State.chartColunasColor || '#E74C3C';

    container.innerHTML = `
      <div class="chart-panel chart-panel-full" id="chart-panel-desembolsos">
        <div class="chart-panel-header">
          <div class="panel-title">
            <span class="dot" id="dot-chart-colunas" style="background:${colunasCol}"></span>
            <span>Desembolsos Programados por Vencimento</span>
          </div>
          <div class="chart-header-right">
            <div class="color-tools" title="Personalizar cor das Saídas">
              <span class="color-tools-label">Cor Saídas:</span>
              <button class="color-swatch ${colunasCol === '#E74C3C' ? 'active' : ''}" style="background:#E74C3C" onclick="ChartsComponent.setColunasColor('#E74C3C', this)" title="Vermelho Carmim"></button>
              <button class="color-swatch ${colunasCol === '#FF6B00' ? 'active' : ''}" style="background:#FF6B00" onclick="ChartsComponent.setColunasColor('#FF6B00', this)" title="Laranja Tigre"></button>
              <button class="color-swatch ${colunasCol === '#3498DB' ? 'active' : ''}" style="background:#3498DB" onclick="ChartsComponent.setColunasColor('#3498DB', this)" title="Azul Oceano"></button>
              <button class="color-swatch ${colunasCol === '#9B59B6' ? 'active' : ''}" style="background:#9B59B6" onclick="ChartsComponent.setColunasColor('#9B59B6', this)" title="Roxo Real"></button>
              <button class="color-swatch ${colunasCol === '#1ABC9C' ? 'active' : ''}" style="background:#1ABC9C" onclick="ChartsComponent.setColunasColor('#1ABC9C', this)" title="Turquesa"></button>
              <label class="color-picker-label" title="Escolher qualquer cor personalizada">
                <input type="color" id="picker-colunas" value="${colunasCol}" onchange="ChartsComponent.setColunasColor(this.value, null)">
                <span class="picker-icon">🎨</span>
              </label>
            </div>
            <span class="chart-resize-hint" title="Arraste a barra inferior do painel para aumentar ou diminuir a altura">↕ Ajustar altura</span>
          </div>
        </div>
        <div class="chart-wrap" id="chart-wrap-desembolsos"><canvas id="chart-colunas"></canvas></div>
        <div class="chart-drag-handle" title="Arraste para ajustar a altura"></div>
      </div>
    `;

    this.setupResizeObserver();
  },

  setupResizeObserver() {
    const panel = document.getElementById('chart-panel-desembolsos');
    if (!panel || typeof ResizeObserver === 'undefined') return;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (State.chartColunasInstance) {
        State.chartColunasInstance.resize();
      }
    });
    this.resizeObserver.observe(panel);
  },

  update(filteredData) {
    this.updateColunas(filteredData);
  },

  getThemeColors() {
    const isLight = document.body.classList.contains('light-theme');
    return {
      textColor: isLight ? '#475569' : '#A0B0C0',
      textPrimary: isLight ? '#0F172A' : '#FFFFFF',
      gridColor: isLight ? 'rgba(203, 213, 225, 0.6)' : 'rgba(46, 74, 107, 0.4)',
      tooltipBg: isLight ? '#FFFFFF' : '#1E2D3D',
      tooltipBorder: isLight ? '#CBD5E1' : '#2E4A6B',
      tooltipTitle: isLight ? '#0F172A' : '#FFFFFF',
      tooltipBody: isLight ? '#475569' : '#A0B0C0'
    };
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
    const theme = this.getThemeColors();

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
              color: theme.textColor, font: { size: 10, weight: '600', family: 'Inter' },
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
              color: theme.textColor, font: { size: 10, weight: '600', family: 'Inter' },
              formatter: v => v > 0 ? Utils.fmtK(v) : ''
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: theme.textColor, font: { size: 11, family: 'Inter' } } },
          tooltip: {
            backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder, borderWidth: 1,
            titleColor: theme.tooltipTitle, bodyColor: theme.tooltipBody,
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.fmt(ctx.raw)}` }
          }
        },
        scales: {
          x: { ticks: { color: theme.textColor, font: { size: 11, family: 'Inter' } }, grid: { color: theme.gridColor } },
          y: { ticks: { color: theme.textColor, font: { size: 10, family: 'Inter' }, callback: v => Utils.fmtK(v) }, grid: { color: theme.gridColor } }
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

    document.querySelectorAll('#chart-panel-desembolsos .color-swatch').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    if (State.chartColunasInstance) {
      this.updateColunas(State.filteredData);
    }
  }
};
