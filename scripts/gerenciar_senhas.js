/**
 * GERENCIADOR AUTOMÁTICO DE SENHAS E USUÁRIOS
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Comandos disponíveis:
 *   1. Listar usuários cadastrados:
 *      node scripts/gerenciar_senhas.js listar
 * 
 *   2. Conferir/Testar se uma senha está correta:
 *      node scripts/gerenciar_senhas.js conferir <usuario> <senha>
 * 
 *   3. Alterar a senha de um usuário AUTOMATICAMENTE no arquivo js/auth-config.js:
 *      node scripts/gerenciar_senhas.js alterar <usuario> <nova_senha>
 * 
 *   4. Criar um novo usuário AUTOMATICAMENTE no arquivo js/auth-config.js:
 *      node scripts/gerenciar_senhas.js criar <usuario> <senha> "[Nome Completo]" [role]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_CONFIG_PATH = path.join(__dirname, '..', 'js', 'auth-config.js');

function carregarArquivo() {
  if (!fs.existsSync(AUTH_CONFIG_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${AUTH_CONFIG_PATH}`);
    process.exit(1);
  }
  return fs.readFileSync(AUTH_CONFIG_PATH, 'utf-8');
}

function salvarArquivo(novoConteudo) {
  fs.writeFileSync(AUTH_CONFIG_PATH, novoConteudo, 'utf-8');
}

function extrairSalt(content) {
  const saltMatch = content.match(/salt:\s*['"]([^'"]+)['"]/);
  return saltMatch ? saltMatch[1] : 'bachinski-agro-2026-auth-salt';
}

function extrairUsuarios(content) {
  const users = [];
  const userRegex = /{\s*username:\s*['"]([^'"]+)['"],\s*displayName:\s*['"]([^'"]+)['"],\s*role:\s*['"]([^'"]+)['"],(?:[^}]+?)passwordHash:\s*['"]([^'"]+)['"]/gs;
  
  let match;
  while ((match = userRegex.exec(content)) !== null) {
    users.push({
      username: match[1],
      displayName: match[2],
      role: match[3],
      passwordHash: match[4]
    });
  }
  return users;
}

function calcularHash(salt, senha) {
  return crypto.createHash('sha256').update(salt + senha).digest('hex');
}

const args = process.argv.slice(2);
const comando = (args[0] || '').toLowerCase();

console.log('===============================================================');
console.log('🌾 Gerenciador Automático de Acessos — Bachinski Gestão Financeira');
console.log('===============================================================');

let content = carregarArquivo();
const salt = extrairSalt(content);
const users = extrairUsuarios(content);

// 1. LISTAR
if (comando === 'listar') {
  console.log(`\n🔑 Sal da aplicação: ${salt}`);
  console.log(`📋 Total de usuários cadastrados: ${users.length}\n`);
  
  users.forEach((u, i) => {
    console.log(`[${i + 1}] Usuário: ${u.username}`);
    console.log(`    Nome:     ${u.displayName}`);
    console.log(`    Perfil:   ${u.role}`);
    console.log(`    Hash:     ${u.passwordHash.slice(0, 16)}...`);
    console.log('');
  });
  process.exit(0);
}

// 2. CONFERIR / TESTAR
if (comando === 'conferir' || comando === 'testar') {
  const usuario = (args[1] || '').trim().toLowerCase();
  const senha = args[2];

  if (!usuario || senha === undefined) {
    console.log('\nUso:');
    console.log('  node scripts/gerenciar_senhas.js conferir <usuario> <senha>\n');
    process.exit(1);
  }

  const user = users.find(u => u.username.toLowerCase() === usuario);
  if (!user) {
    console.log(`\n❌ Usuário "${usuario}" não foi encontrado em js/auth-config.js.`);
    console.log('   Usuários disponíveis:', users.map(u => u.username).join(', '));
    process.exit(1);
  }

  const hashCalculado = calcularHash(salt, senha);
  if (hashCalculado === user.passwordHash) {
    console.log(`\n✅ SUCESSO! A senha digitada está CORRETA para "${user.displayName}" (${user.username}).`);
  } else {
    console.log(`\n❌ SENHA INCORRETA para "${user.displayName}" (${user.username}).`);
  }
  process.exit(0);
}

// 3. ALTERAR SENHA AUTOMATICAMENTE
if (comando === 'alterar') {
  const usuario = (args[1] || '').trim().toLowerCase();
  const novaSenha = args[2];

  if (!usuario || !novaSenha) {
    console.log('\nUso:');
    console.log('  node scripts/gerenciar_senhas.js alterar <usuario> <nova_senha>\n');
    console.log('Exemplo:');
    console.log('  node scripts/gerenciar_senhas.js alterar alan.diligence MinhaNovaSenha123\n');
    process.exit(1);
  }

  const user = users.find(u => u.username.toLowerCase() === usuario);
  if (!user) {
    console.log(`\n❌ Usuário "${usuario}" não foi encontrado para alteração.`);
    console.log('   Para criar um novo usuário, use:');
    console.log(`   node scripts/gerenciar_senhas.js criar ${usuario} ${novaSenha} "${usuario}"\n`);
    process.exit(1);
  }

  const novoHash = calcularHash(salt, novaSenha);

  // Expressão regular para substituir o passwordHash do bloco deste usuário específico
  const userBlockRegex = new RegExp(
    `({\\s*username:\\s*['"]${usuario}['"][\\s\\S]*?passwordHash:\\s*['"])([^'"]+)(['"])`,
    'i'
  );

  if (!userBlockRegex.test(content)) {
    console.error(`❌ Não foi possível localizar o bloco do usuário "${usuario}" no arquivo.`);
    process.exit(1);
  }

  const novoConteudo = content.replace(userBlockRegex, `$1${novoHash}$3`);
  salvarArquivo(novoConteudo);

  console.log(`\n✅ SENHA ALTERADA COM SUCESSO NO ARQUIVO AUTOMATICAMENTE!`);
  console.log(`👤 Usuário:      ${user.displayName} (${user.username})`);
  console.log(`🔑 Novo Hash:     ${novoHash.slice(0, 24)}...`);
  console.log(`📁 Arquivo salvo: js/auth-config.js\n`);
  process.exit(0);
}

// 4. CRIAR NOVO USUÁRIO AUTOMATICAMENTE
if (comando === 'criar' || comando === 'adicionar') {
  const usuario = (args[1] || '').trim().toLowerCase();
  const senha = args[2];
  const displayName = args[3] ? args[3].trim() : usuario;
  const role = (args[4] || 'user').trim().toLowerCase();

  if (!usuario || !senha) {
    console.log('\nUso:');
    console.log('  node scripts/gerenciar_senhas.js criar <usuario> <senha> "[Nome Completo]" [role]\n');
    console.log('Exemplo:');
    console.log('  node scripts/gerenciar_senhas.js criar maria.silva 123456 "Maria Silva" user\n');
    process.exit(1);
  }

  const userExiste = users.find(u => u.username.toLowerCase() === usuario);
  if (userExiste) {
    console.log(`\n⚠️ O usuário "${usuario}" já existe!`);
    console.log(`   Para alterar a senha dele, use:`);
    console.log(`   node scripts/gerenciar_senhas.js alterar ${usuario} ${senha}\n`);
    process.exit(1);
  }

  const novoHash = calcularHash(salt, senha);
  const dataHoje = new Date().toISOString().slice(0, 10);

  const novoBlocoUsuario = `    {
      username: '${usuario}',
      displayName: '${displayName}',
      role: '${role}',
      passwordHash: '${novoHash}',
      createdAt: '${dataHoje}'
    },
  ];`;

  // Substitui o final do array `users: [ ... ]`
  const fechamentoArrayRegex = /(\s*)\]\s*;\s*};/s;
  if (!fechamentoArrayRegex.test(content)) {
    console.error('❌ Não foi possível localizar o fechamento do array users em js/auth-config.js.');
    process.exit(1);
  }

  const novoConteudo = content.replace(fechamentoArrayRegex, `\n${novoBlocoUsuario}\n};`);
  salvarArquivo(novoConteudo);

  console.log(`\n✅ NOVO USUÁRIO CRIADO E SALVO AUTOMATICAMENTE!`);
  console.log(`👤 Usuário:      ${usuario}`);
  console.log(`🏷️ Nome:         ${displayName}`);
  console.log(`🛡️ Perfil:       ${role}`);
  console.log(`🔑 Hash Gerado:  ${novoHash.slice(0, 24)}...`);
  console.log(`📁 Arquivo salvo: js/auth-config.js\n`);
  process.exit(0);
}

// AJUDA
console.log('\nComandos disponíveis:\n');
console.log('1. Listar usuários cadastrados:');
console.log('   node scripts/gerenciar_senhas.js listar\n');
console.log('2. Conferir/Testar senha:');
console.log('   node scripts/gerenciar_senhas.js conferir <usuario> <senha>\n');
console.log('3. Alterar senha AUTOMATICAMENTE no arquivo:');
console.log('   node scripts/gerenciar_senhas.js alterar <usuario> <nova_senha>\n');
console.log('4. Criar novo usuário AUTOMATICAMENTE no arquivo:');
console.log('   node scripts/gerenciar_senhas.js criar <usuario> <senha> "[Nome]" [admin|user]\n');
