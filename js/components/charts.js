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
    const activeData = State.getActiveData(filteredData);
    const byDay = {};
    activeData.forEach(r => {
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

    this._currentSorted = sorted;

    const colorSaida = State.chartColunasColor || '#E74C3C';
    const theme = this.getThemeColors();
    const selDay = State.selectedDay;

    const bgSaidas = sorted.map(([k]) => {
      if (!selDay) return Utils.hexToRgba(colorSaida, 0.85);
      return k === selDay ? colorSaida : Utils.hexToRgba(colorSaida, 0.22);
    });
    const borderSaidas = sorted.map(([k]) => {
      if (!selDay) return colorSaida;
      return k === selDay ? '#FFFFFF' : Utils.hexToRgba(colorSaida, 0.3);
    });
    const bwSaidas = sorted.map(([k]) => (selDay && k === selDay ? 2 : 1));

    const bgEntradas = sorted.map(([k]) => {
      if (!selDay) return 'rgba(46, 204, 113, 0.75)';
      return k === selDay ? '#2ECC71' : 'rgba(46, 204, 113, 0.22)';
    });
    const borderEntradas = sorted.map(([k]) => {
      if (!selDay) return '#2ECC71';
      return k === selDay ? '#FFFFFF' : 'rgba(46, 204, 113, 0.3)';
    });
    const bwEntradas = sorted.map(([k]) => (selDay && k === selDay ? 2 : 1));

    // Se a instância já existe, atualiza dados in-place com animação suave e sem piscar/destruir o canvas
    if (State.chartColunasInstance) {
      const chart = State.chartColunasInstance;
      chart.data.labels = labels;

      chart.data.datasets[0].data = saidas;
      chart.data.datasets[0].backgroundColor = bgSaidas;
      chart.data.datasets[0].borderColor = borderSaidas;
      chart.data.datasets[0].borderWidth = bwSaidas;
      if (chart.data.datasets[0].datalabels) {
        chart.data.datasets[0].datalabels.color = theme.textColor;
      }

      chart.data.datasets[1].data = entradas;
      chart.data.datasets[1].backgroundColor = bgEntradas;
      chart.data.datasets[1].borderColor = borderEntradas;
      chart.data.datasets[1].borderWidth = bwEntradas;
      if (chart.data.datasets[1].datalabels) {
        chart.data.datasets[1].datalabels.color = theme.textColor;
      }

      if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = theme.textColor;
      }
      if (chart.options.plugins && chart.options.plugins.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
        chart.options.plugins.tooltip.borderColor = theme.tooltipBorder;
        chart.options.plugins.tooltip.titleColor = theme.tooltipTitle;
        chart.options.plugins.tooltip.bodyColor = theme.tooltipBody;
      }
      if (chart.options.scales && chart.options.scales.x) {
        chart.options.scales.x.ticks.color = theme.textColor;
        chart.options.scales.x.ticks.maxTicksLimit = window.innerWidth <= 680 ? 6 : 14;
        chart.options.scales.x.grid.color = theme.gridColor;
      }
      if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.ticks.color = theme.textColor;
        chart.options.scales.y.grid.color = theme.gridColor;
      }

      chart.update();
      return;
    }

    const datalabelsConfig = {
      display: function(context) {
        const count = context.chart.data.labels.length;
        const isMobile = window.innerWidth <= 680;
        if (isMobile) {
          // No celular, oculta rótulos sobre as barras se houver mais de 6 barras para evitar colisão visual
          return count <= 6;
        }
        return count <= 18;
      },
      anchor: 'end',
      align: 'top',
      offset: 2,
      color: theme.textColor,
      font: { size: 9, weight: '600', family: 'Inter' },
      formatter: v => v > 0 ? Utils.fmtK(v) : ''
    };

    State.chartColunasInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Saídas',
            data: saidas,
            backgroundColor: bgSaidas,
            borderColor: borderSaidas,
            borderWidth: bwSaidas,
            borderRadius: 6,
            datalabels: datalabelsConfig
          },
          {
            label: 'Entradas',
            data: entradas,
            backgroundColor: bgEntradas,
            borderColor: borderEntradas,
            borderWidth: bwEntradas,
            borderRadius: 6,
            datalabels: datalabelsConfig
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 350,
          easing: 'easeOutQuart'
        },
        onClick: (evt, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const current = ChartsComponent._currentSorted || sorted;
            if (current && current[idx] && typeof AlertsComponent !== 'undefined') {
              AlertsComponent.selectDay(current[idx][0]);
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: theme.textColor,
              font: { size: window.innerWidth <= 680 ? 10 : 11, family: 'Inter' },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const current = ChartsComponent._currentSorted || sorted;
                if (current && current[idx]) {
                  const [key] = current[idx];
                  const [y, m, d] = key.split('-');
                  const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
                  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                  return `${dayNames[dObj.getDay()]}, ${Utils.formatDateBR(dObj)}`;
                }
                return items[0].label;
              },
              label: ctx => ` ${ctx.dataset.label}: ${Utils.fmt(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: theme.textColor,
              font: { size: window.innerWidth <= 680 ? 9.5 : 11, family: 'Inter' },
              autoSkip: true,
              maxTicksLimit: window.innerWidth <= 680 ? 6 : 14,
              maxRotation: 0,
              minRotation: 0
            },
            grid: { color: theme.gridColor }
          },
          y: {
            ticks: {
              color: theme.textColor,
              font: { size: 9.5, family: 'Inter' },
              callback: v => Utils.fmtK(v)
            },
            grid: { color: theme.gridColor }
          }
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
