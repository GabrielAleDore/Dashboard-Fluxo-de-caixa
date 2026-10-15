/**
 * SCRIPT UTILITÁRIO DE CADASTRO DE USUÁRIO
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Uso:
 *   node scripts/criar_usuario.js <usuario> <senha> "[Nome Completo]"
 * 
 * Exemplo:
 *   node scripts/criar_usuario.js gabriel MinhaSenha123 "Gabriel Doré"
 */

const crypto = require('crypto');

// Sal secreto da aplicação (deve ser idêntico ao de js/auth-config.js)
const SALT = 'bachinski-agro-2026-auth-salt';

function gerarHash(senha) {
  return crypto.createHash('sha256').update(SALT + senha).digest('hex');
}

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('===============================================================');
  console.log('🌾 Gerador de Credenciais de Usuário — Bachinski Gestão Financeira');
  console.log('===============================================================');
  console.log('\nUso:');
  console.log('  node scripts/criar_usuario.js <usuario> <senha> "[Nome Completo]"\n');
  console.log('Exemplo:');
  console.log('  node scripts/criar_usuario.js gabriel 123456 "Gabriel Doré"\n');
  process.exit(1);
}

const username = args[0].trim().toLowerCase();
const password = args[1];
const displayName = args[2] ? args[2].trim() : username;
const passwordHash = gerarHash(password);

console.log('===============================================================');
console.log('🌾 Usuário gerado com sucesso!');
console.log('===============================================================');
console.log('Copie e cole o bloco abaixo no array `users` em `js/auth-config.js`:\n');

const snippet = `    {
      username: '${username}',
      displayName: '${displayName}',
      role: 'user',
      passwordHash: '${passwordHash}',
      createdAt: '${new Date().toISOString().slice(0, 10)}'
    },`;

console.log(snippet);
console.log('\n===============================================================');
