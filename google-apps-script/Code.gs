/**
 * GOOGLE APPS SCRIPT — WEB APP ENDPOINT (v2.9.0)
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Novidades v2.9.0:
 * 1. Ingestão Contínua 100% Nuvem: baixa o CSV automaticamente de hora em hora via UrlFetchApp.
 * 2. Atualização sob Demanda: clique no botão "Sincronizar" no dashboard força o download imediato.
 * 3. Proteção por API Key: chamadas sem a chave de acesso correta são rejeitadas (HTTP 403).
 * 4. Isolamento Seguro: URL do download e chave de API protegidas em ScriptProperties.
 * 
 * Instruções de Implantação:
 * 1. Abra o projeto no Google Apps Script (script.google.com).
 * 2. Cole este código no arquivo Code.gs.
 * 3. Configure as Propriedades do Script (Ícone de Engrenagem ⚙️ > Propriedades do script):
 *    - FOLDER_ID: ID da pasta do Google Drive onde os CSVs serão salvos.
 *    - CSV_DOWNLOAD_URL: Link direto de download do sistema/ERP (SWRural).
 *    - API_KEY: Chave secreta de acesso (ex.: bachinski-agro-2026-auth-salt).
 * 4. Ative o Disparador Automático (Ícone de Relógio ⏰ > Adicionar Acionador):
 *    - Função: rotinaAtualizacaoHoraria
 *    - Origem: Baseado no tempo
 *    - Tipo: Contador de horas -> A cada hora
 * 5. Clique em "Implantar" > "Gerenciar implantações" > Editar > "Nova versão" > Concluir.
 */

// Constantes de fallback caso não estejam configuradas em ScriptProperties
const DEFAULT_FOLDER_ID = 'SEU_FOLDER_ID_DO_GOOGLE_DRIVE_AQUI';
const DEFAULT_API_KEY = 'bachinski-agro-2026-auth-salt';
const AJUSTES_FILE_NAME = 'ajustes_financeiros.json';
const MAX_HISTORICO_CSVS = 10; // Mantém no máximo os 10 CSVs mais recentes

/**
 * Carrega a configuração unificada mesclando ScriptProperties com fallbacks locais
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    folderId: props.getProperty('FOLDER_ID') || DEFAULT_FOLDER_ID,
    csvDownloadUrl: props.getProperty('CSV_DOWNLOAD_URL') || '',
    apiKey: props.getProperty('API_KEY') || DEFAULT_API_KEY
  };
}

/**
 * Valida a chave de API fornecida na requisição
 */
function validarApiKey(e, config) {
  if (!config.apiKey) return true; // Se não houver chave configurada, permite por compatibilidade

  let providedKey = null;

  // Busca na Query String (GET ou POST)
  if (e && e.parameter && e.parameter.apiKey) {
    providedKey = e.parameter.apiKey;
  }

  // Busca no Payload JSON (POST)
  if (!providedKey && e && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      if (body && body.apiKey) providedKey = body.apiKey;
    } catch (ignore) {}
  }

  if (providedKey !== config.apiKey) {
    throw new Error('Acesso não autorizado: API_KEY inválida ou ausente.');
  }
  return true;
}

/**
 * Obtém ou inicializa o arquivo auxiliar de ajustes manuais
 */
function getAjustesData(folder) {
  const files = folder.getFilesByName(AJUSTES_FILE_NAME);
  if (files.hasNext()) {
    const file = files.next();
    try {
      const content = file.getBlob().getDataAsString('UTF-8');
      const data = JSON.parse(content) || {};
      return {
        file: file,
        data: {
          dateOverrides: (data && data.dateOverrides) ? data.dateOverrides : {},
          manualEntries: (data && Array.isArray(data.manualEntries)) ? data.manualEntries : []
        }
      };
    } catch (e) {
      return {
        file: file,
        data: { dateOverrides: {}, manualEntries: [] }
      };
    }
  } else {
    const defaultData = { dateOverrides: {}, manualEntries: [] };
    const createdFile = folder.createFile(AJUSTES_FILE_NAME, JSON.stringify(defaultData, null, 2), MimeType.PLAIN_TEXT);
    return {
      file: createdFile,
      data: defaultData
    };
  }
}

/**
 * Salva os dados atualizados no arquivo ajustes_financeiros.json
 */
function saveAjustesData(file, data) {
  file.setContent(JSON.stringify(data, null, 2));
}

/**
 * Baixa o CSV fresco a partir do link direto configurado e grava na pasta do Drive
 */
function atualizarBaseDoLink(folder, config) {
  if (!config.csvDownloadUrl) {
    Logger.log('AVISO: CSV_DOWNLOAD_URL não está configurada em ScriptProperties. Download ignorado.');
    return null;
  }

  try {
    Logger.log('Iniciando download da base via link: ' + config.csvDownloadUrl);
    const response = UrlFetchApp.fetch(config.csvDownloadUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Bachinski-Agro-Dashboard/2.9.0'
      }
    });

    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      throw new Error('Falha ao baixar CSV do link de origem. Código HTTP: ' + statusCode);
    }

    const blob = response.getBlob();
    if (blob.getBytes().length < 50) {
      throw new Error('Arquivo recebido do link de origem está vazio ou corrompido.');
    }

    // Gera nome único com timestamp formatado no fuso horário do Brasil
    const timestamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd_HHmm');
    const fileName = 'fluxo_caixa_' + timestamp + '.csv';

    blob.setName(fileName);
    const createdFile = folder.createFile(blob);
    Logger.log('Novo arquivo CSV criado com sucesso: ' + fileName);

    // Rotina de limpeza higiênica: mantém apenas os MAX_HISTORICO_CSVS mais recentes
    limparHistoricoAntigo(folder);

    return createdFile;

  } catch (error) {
    Logger.log('ERRO em atualizarBaseDoLink: ' + error.toString());
    throw error;
  }
}

/**
 * Remove CSVs antigos da pasta para evitar acúmulo desnecessário
 */
function limparHistoricoAntigo(folder) {
  try {
    const files = folder.getFiles();
    const csvFiles = [];

    while (files.hasNext()) {
      const file = files.next();
      if (!file.isTrashed() && file.getName().toLowerCase().endsWith('.csv')) {
        csvFiles.push({
          file: file,
          updated: file.getLastUpdated().getTime()
        });
      }
    }

    // Ordena do mais recente para o mais antigo
    csvFiles.sort((a, b) => b.updated - a.updated);

    // Envia para a lixeira os arquivos que excederem o limite
    if (csvFiles.length > MAX_HISTORICO_CSVS) {
      for (let i = MAX_HISTORICO_CSVS; i < csvFiles.length; i++) {
        csvFiles[i].file.setTrashed(true);
        Logger.log('Arquivo antigo enviado para a lixeira: ' + csvFiles[i].file.getName());
      }
    }
  } catch (e) {
    Logger.log('Aviso na limpeza de arquivos antigos: ' + e.toString());
  }
}

/**
 * TRIGGER AUTOMÁTICO DE 1 EM 1 HORA:
 * Função vinculada ao acionador temporal do Google Apps Script
 */
function rotinaAtualizacaoHoraria() {
  const config = getConfig();
  if (!config.folderId || config.folderId === DEFAULT_FOLDER_ID) {
    Logger.log('FOLDER_ID não configurado. Rotina horária abortada.');
    return;
  }
  const folder = DriveApp.getFolderById(config.folderId);
  atualizarBaseDoLink(folder, config);
}

/**
 * ENDPOINT GET: Retorna o CSV mais recente mesclado com metadados e ajustes
 * Parâmetros aceitos:
 *  - apiKey: chave secreta de autenticação
 *  - forceDownload=true: força o download imediato do link direto antes de responder
 */
function doGet(e) {
  try {
    const config = getConfig();

    // Validação estrita de segurança
    validarApiKey(e, config);

    if (!config.folderId || config.folderId === DEFAULT_FOLDER_ID) {
      throw new Error('FOLDER_ID não configurado no script do Google Apps Script.');
    }

    const folder = DriveApp.getFolderById(config.folderId);

    // Se o cliente solicitou atualização forçada pelo botão "Sincronizar"
    let syncTriggered = false;
    if (e && e.parameter && (e.parameter.forceDownload === 'true' || e.parameter.force === 'true')) {
      try {
        atualizarBaseDoLink(folder, config);
        syncTriggered = true;
      } catch (fetchErr) {
        Logger.log('Aviso: Falha ao forçar download, prosseguindo com último arquivo disponível: ' + fetchErr.toString());
      }
    }

    // Busca o arquivo CSV mais recente na pasta
    const files = folder.getFiles();
    let latestFile = null;
    let latestUpdated = new Date(0);

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName().toLowerCase();

      if (!file.isTrashed() && fileName.endsWith('.csv')) {
        const fileUpdated = file.getLastUpdated();
        if (fileUpdated > latestUpdated) {
          latestUpdated = fileUpdated;
          latestFile = file;
        }
      }
    }

    if (!latestFile) {
      throw new Error('Nenhum arquivo .csv encontrado na pasta informada.');
    }

    // Leitura dos bytes do CSV em ISO-8859-1 para preservar acentuações e caracteres BR
    const blob = latestFile.getBlob();
    const csvData = blob.getDataAsString('ISO-8859-1');

    // Leitura dos ajustes manuais (data overrides e lançamentos manuais)
    const ajustes = getAjustesData(folder);

    const response = {
      status: 'success',
      fileName: latestFile.getName(),
      lastModified: latestFile.getLastUpdated().toISOString(),
      csvData: csvData,
      dateOverrides: ajustes.data.dateOverrides,
      manualEntries: ajustes.data.manualEntries,
      syncTriggered: syncTriggered
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const isAuthError = error.message && error.message.includes('API_KEY');
    const errorResponse = {
      status: 'error',
      statusCode: isAuthError ? 403 : 500,
      message: error.message || error.toString()
    };

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ENDPOINT POST: Recebe ações para salvar reprogramação de data ou novo lançamento manual
 */
function doPost(e) {
  try {
    const config = getConfig();

    // Validação estrita de segurança
    validarApiKey(e, config);

    if (!config.folderId || config.folderId === DEFAULT_FOLDER_ID) {
      throw new Error('FOLDER_ID não configurado no script do Google Apps Script.');
    }

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Payload da requisição POST não fornecido.');
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;

    const folder = DriveApp.getFolderById(config.folderId);
    const ajustes = getAjustesData(folder);

    if (action === 'SAVE_DATE_OVERRIDE') {
      if (!payload || !payload.id || !payload.newDate) {
        throw new Error('Parâmetros id e newDate são obrigatórios para SAVE_DATE_OVERRIDE.');
      }
      ajustes.data.dateOverrides[payload.id] = payload.newDate;
      saveAjustesData(ajustes.file, ajustes.data);

      const response = {
        status: 'success',
        action: action,
        message: 'Data de vencimento atualizada com sucesso.',
        dateOverrides: ajustes.data.dateOverrides
      };
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'ADD_MANUAL_ENTRY') {
      if (!payload || !payload.id || !payload.vencimento) {
        throw new Error('Dados do lançamento manual inválidos.');
      }
      ajustes.data.manualEntries.push(payload);
      saveAjustesData(ajustes.file, ajustes.data);

      const response = {
        status: 'success',
        action: action,
        message: 'Lançamento manual incluído com sucesso.',
        entry: payload
      };
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'DELETE_MANUAL_ENTRY') {
      if (!payload || !payload.id) {
        throw new Error('ID do lançamento manual não fornecido.');
      }
      ajustes.data.manualEntries = (ajustes.data.manualEntries || []).filter(function(e) {
        return e.id !== payload.id;
      });
      if (ajustes.data.dateOverrides && ajustes.data.dateOverrides[payload.id]) {
        delete ajustes.data.dateOverrides[payload.id];
      }
      saveAjustesData(ajustes.file, ajustes.data);

      const response = {
        status: 'success',
        action: action,
        message: 'Lançamento manual excluído com sucesso.',
        id: payload.id
      };
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'FORCE_REFRESH') {
      const createdFile = atualizarBaseDoLink(folder, config);
      const response = {
        status: 'success',
        action: action,
        message: 'Base atualizada com sucesso a partir do link de origem.',
        fileName: createdFile ? createdFile.getName() : null
      };
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);

    } else {
      throw new Error('Ação não reconhecida: ' + action);
    }

  } catch (error) {
    const isAuthError = error.message && error.message.includes('API_KEY');
    const errorResponse = {
      status: 'error',
      statusCode: isAuthError ? 403 : 500,
      message: error.message || error.toString()
    };

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
