/**
 * CSV PARSER MODULE
 * Leitura, detecção de delimitadores, limpeza e normalização da base de dados
 */

const CsvParser = {
  /**
   * Gera um hash simples e determinístico (djb2) para strings
   */
  hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Converte para inteiro de 32 bits
    }
    return Math.abs(hash).toString(16);
  },

  parse(text) {
    if (!text || !text.trim()) {
      throw new Error('Arquivo vazio ou inválido.');
    }

    // Detectar delimitador (; ou ,)
    const firstLines = text.split('\n').slice(0, 3).join('\n');
    const hasSemicolon = (firstLines.match(/;/g) || []).length > (firstLines.match(/,/g) || []).length;
    const delimiter = hasSemicolon ? ';' : ',';

    // Pular linha técnica "sep=;" caso exista
    let lines = text.split('\n');
    if (lines[0].startsWith('sep=')) lines = lines.slice(1);
    const cleanText = lines.join('\n');

    const result = Papa.parse(cleanText, {
      delimiter,
      header: true,
      skipEmptyLines: true,
      trimHeaders: true
    });

    const rows = result.data;
    if (!rows.length) {
      throw new Error('Nenhuma linha de dados encontrada no CSV.');
    }

    const normalized = [];
    const idFrequencyMap = {};

    for (const row of rows) {
      const keys = Object.keys(row);
      const get = (fragments) => {
        const k = keys.find(k => fragments.some(f => k.toLowerCase().replace(/[^a-z]/g, '').includes(f)));
        return k ? row[k] : '';
      };

      const parcela    = get(['parcela']);
      const emissaoRaw = get(['emiss', 'emission']);
      const vencRaw    = get(['vencimento', 'venc']);
      const credor     = get(['credor', 'creditor']);
      const historico  = get(['hist', 'historic']);
      const moeda      = get(['moeda', 'currency']);
      const entradaRaw = get(['entrada', 'entry', 'input']);
      const saidaRaw   = get(['saida', 'sa', 'output', 'exit']);
      const saldoRaw   = get(['saldo', 'balance']);

      // Ignora linha de total consolidado
      if (moeda && moeda.toString().trim().toUpperCase() === 'TOTAL') continue;
      if (!credor && !vencRaw) continue;

      const vencimento = Utils.parseDate(vencRaw);
      const emissao    = Utils.parseDate(emissaoRaw);
      const entrada    = Utils.parseNum(entradaRaw);
      const saida      = Utils.parseNum(saidaRaw);
      const saldo      = Utils.parseNum(saldoRaw);

      if (!vencimento) continue;

      // Geração de ID determinístico único baseado no conteúdo da transação
      const cleanParcela   = (parcela || '').trim();
      const cleanCredor    = (credor || '').trim();
      const cleanHistorico = (historico || '').trim();
      const vencKey        = Utils.toInputDate(vencimento);
      const baseSignature  = `${cleanParcela}|${cleanCredor}|${vencKey}|${entrada}|${saida}|${cleanHistorico}`;
      const baseHash       = this.hashString(baseSignature);

      // Tratamento de colisões no mesmo arquivo (ex: parcelas idênticas)
      const count = (idFrequencyMap[baseHash] || 0) + 1;
      idFrequencyMap[baseHash] = count;
      const deterministicId = count === 1 ? `mov_${baseHash}` : `mov_${baseHash}_${count}`;

      normalized.push({
        id: deterministicId,
        parcela: cleanParcela,
        emissao,
        originalVencimento: vencimento,
        vencimento,
        credor: cleanCredor,
        historico: cleanHistorico,
        entrada,
        saida,
        saldo,
        liquido: entrada - saida,
        isReprogrammed: false,
        isManual: false
      });
    }

    return normalized;
  }
};
