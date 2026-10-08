/**
 * GOOGLE APPS SCRIPT — WEB APP ENDPOINT
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Instruções de Implantação:
 * 1. Crie ou abra o projeto no Google Apps Script (script.google.com).
 * 2. Cole este código no arquivo Code.gs.
 * 3. Configure a constante FOLDER_ID com o ID da pasta do Google Drive onde os CSVs são salvos.
 * 4. Clique em "Implantar" > "Gerenciar implantações" > Editar (ou Nova implantação) > Tipo: "App da Web".
 * 5. Executar como: "Eu" (sua conta).
 * 6. Quem tem acesso: "Qualquer pessoa" (permite requisições GET e POST via SPA).
 * 7. Copie a URL do Web App gerada e configure em State.driveApiUrl.
 */

// ID da pasta do Google Drive contendo os arquivos de fluxo de caixa
const FOLDER_ID = 'SEU_FOLDER_ID_DO_GOOGLE_DRIVE_AQUI';
const AJUSTES_FILE_NAME = 'ajustes_financeiros.json';

/**
 * Obtém ou inicializa o arquivo auxiliar de ajustes manuais
 */
function getAjustesData(folder) {
  const files = folder.getFilesByName(AJUSTES_FILE_NAME);
  if (files.hasNext()) {
    const file = files.next();
    try {
      const content = file.getBlob().getDataAsString('UTF-8');
      const data = JSON.parse(content);
      return {
        file: file,
        data: {
          dateOverrides: data.dateOverrides || {},
          manualEntries: data.manualEntries || []
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
 * ENDPOINT GET: Retorna o CSV mais recente mesclado com metadados e ajustes
 */
function doGet(e) {
  try {
    if (!FOLDER_ID || FOLDER_ID === 'SEU_FOLDER_ID_DO_GOOGLE_DRIVE_AQUI') {
      throw new Error('FOLDER_ID não configurado no script do Google Apps Script.');
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();

    let latestFile = null;
    let latestUpdated = new Date(0);

    // Varre arquivos filtrando apenas a extensão .csv
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName().toLowerCase();

      if (fileName.endsWith('.csv')) {
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
      manualEntries: ajustes.data.manualEntries
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = {
      status: 'error',
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
    if (!FOLDER_ID || FOLDER_ID === 'SEU_FOLDER_ID_DO_GOOGLE_DRIVE_AQUI') {
      throw new Error('FOLDER_ID não configurado no script do Google Apps Script.');
    }

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Payload da requisição POST não fornecido.');
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const ajustes = getAjustesData(folder);

    if (action === 'SAVE_DATE_OVERRIDE') {
      // payload: { id: string, newDate: string (YYYY-MM-DD) }
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
      // payload: { id, parcela, emissao, vencimento, credor, historico, entrada, saida, saldo, liquido, isManual: true }
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
      // payload: { id }
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

    } else {
      throw new Error('Ação não reconhecida: ' + action);
    }

  } catch (error) {
    const errorResponse = {
      status: 'error',
      message: error.message || error.toString()
    };

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
