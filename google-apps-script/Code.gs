/**
 * GOOGLE APPS SCRIPT — WEB APP ENDPOINT
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Instruções de Implantação:
 * 1. Crie um novo projeto no Google Apps Script (script.google.com).
 * 2. Cole este código no arquivo Code.gs.
 * 3. Configure a constante FOLDER_ID com o ID da pasta do Google Drive onde os CSVs são salvos.
 * 4. Clique em "Implantar" > "Nova implantação" > Tipo: "App da Web".
 * 5. Executar como: "Eu" (sua conta).
 * 6. Quem tem acesso: "Qualquer pessoa" (permite requisição fetch via SPA).
 * 7. Copie a URL do Web App gerada e configure em State.driveApiUrl.
 */

// ID da pasta do Google Drive contendo os arquivos de fluxo de caixa
const FOLDER_ID = 'SEU_FOLDER_ID_DO_GOOGLE_DRIVE_AQUI';

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

    // Leitura dos bytes em ISO-8859-1 para preservar acentuações e caracteres BR
    const blob = latestFile.getBlob();
    const csvData = blob.getDataAsString('ISO-8859-1');

    const response = {
      status: 'success',
      fileName: latestFile.getName(),
      lastModified: latestFile.getLastUpdated().toISOString(),
      csvData: csvData
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
