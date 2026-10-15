/**
 * AUTH CONFIGURATION MODULE
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Este arquivo define a lista de credenciais autorizadas sem banco de dados.
 * As senhas NUNCA são salvas em texto puro, apenas seus hashes criptográficos SHA-256 combinados com o sal.
 * 
 * Para cadastrar novos usuários ou redefinir senhas, use o script de terminal:
 *   node scripts/criar_usuario.js <usuario> <senha> "[Nome Completo]"
 */

const AuthConfig = {
  // Sal secreto da aplicação (fortalece os hashes contra ataques de dicionário e rainbow tables)
  salt: 'bachinski-agro-2026-auth-salt',

  // Configurações de segurança contra força bruta
  maxFailedAttempts: 5,
  cooldownSeconds: 30,

  // Lista de usuários autorizados cadastrados manualmente pelo responsável
  users: [
    {
      username: 'admin',
      displayName: 'Administrador Bachinski',
      role: 'admin',
      // Senha inicial: bachinski2026
      passwordHash: '95e83ccbf518eb1eddf086bd0df19d33c7447bd5149e6270a90bfd73e77714d8',
      createdAt: '2026-10-15'
    },
    {
      username: 'gabriel.dore',
      displayName: 'Gabriel Doré',
      role: 'admin',
      passwordHash: '624e69969a174ccf930c409b3390e937e4a76579adf34859fcf9e9fdd6d6d71a',
      createdAt: '2026-10-15'
    },
    {
      username: 'flavio.dore',
      displayName: 'Flavio Doré',
      role: 'user',
      passwordHash: 'f267f76c41be16d6477d7682574539e80300457246398efb245b5dc376e23608',
      createdAt: '2026-10-15'
    }
  ]
};
