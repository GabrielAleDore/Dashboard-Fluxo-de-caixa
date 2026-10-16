/**
 * GERENCIADOR DE SENHAS E USUÁRIOS
 * Condomínio Agrícola Familiar Bachinski — Gestão Financeira
 * 
 * Comandos disponíveis:
 *   1. Listar usuários cadastrados:
 *      node scripts/gerenciar_senhas.js listar
 * 
 *   2. Conferir/Testar se uma senha está correta:
 *      node scripts/gerenciar_senhas.js conferir <usuario> <senha>
 * 
 *   3. Gerar hash para alterar ou cadastrar senha:
 *      node scripts/gerenciar_senhas.js alterar <usuario> <nova_senha>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_CONFIG_PATH = path.join(__dirname, '..', 'js', 'auth-config.js');

function carregarConfig() {
  if (!fs.existsSync(AUTH_CONFIG_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${AUTH_CONFIG_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(AUTH_CONFIG_PATH, 'utf-8');
  
  // Extrai o salt
  const saltMatch = content.match(/salt:\s*['"]([^'"]+)['"]/);
  const salt = saltMatch ? saltMatch[1] : 'bachinski-agro-2026-auth-salt';

  // Extrai os usuários via regex simples
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

  return { salt, users, content };
}

function calcularHash(salt, senha) {
  return crypto.createHash('sha256').update(salt + senha).digest('hex');
}

const args = process.argv.slice(2);
const comando = (args[0] || '').toLowerCase();

console.log('===============================================================');
console.log('🌾 Gerenciador de Acessos & Senhas — Bachinski Gestão Financeira');
console.log('===============================================================');

const { salt, users, content } = carregarConfig();

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

if (comando === 'conferir' || comando === 'testar') {
  const usuario = (args[1] || '').trim().toLowerCase();
  const senha = args[2];

  if (!usuario || senha === undefined) {
    console.log('\nUso:');
    console.log('  node scripts/gerenciar_senhas.js conferir <usuario> <senha_para_testar>\n');
    process.exit(1);
  }

  const user = users.find(u => u.username.toLowerCase() === usuario);
  if (!user) {
    console.log(`\n❌ Usuário "${usuario}" não foi encontrado no arquivo js/auth-config.js.`);
    console.log('   Usuários disponíveis:', users.map(u => u.username).join(', '));
    process.exit(1);
  }

  const hashCalculado = calcularHash(salt, senha);
  if (hashCalculado === user.passwordHash) {
    console.log(`\n✅ SUCESSO! A senha digitada está CORRETA para "${user.displayName}" (${user.username}).`);
  } else {
    console.log(`\n❌ SENHA INCORRETA para "${user.displayName}" (${user.username}).`);
    console.log('   O hash gerado não confere com o cadastrado.');
  }
  process.exit(0);
}

if (comando === 'alterar' || comando === 'gerar') {
  const usuario = (args[1] || '').trim().toLowerCase();
  const novaSenha = args[2];

  if (!usuario || !novaSenha) {
    console.log('\nUso:');
    console.log('  node scripts/gerenciar_senhas.js alterar <usuario> <nova_senha>\n');
    console.log('Exemplo:');
    console.log('  node scripts/gerenciar_senhas.js alterar admin MinhaNovaSenha123\n');
    process.exit(1);
  }

  const novoHash = calcularHash(salt, novaSenha);
  console.log(`\n🔐 Nova senha definida para: ${usuario}`);
  console.log(`🔑 Novo PasswordHash:`);
  console.log(`   ${novoHash}\n`);

  const user = users.find(u => u.username.toLowerCase() === usuario);
  if (user) {
    console.log(`👉 Para atualizar o usuário existente "${usuario}" no arquivo js/auth-config.js:`);
    console.log(`   Substitua o passwordHash antigo pelo novo:`);
    console.log(`   passwordHash: '${novoHash}'\n`);
  } else {
    console.log(`👉 Usuário novo! Adicione este bloco no array users em js/auth-config.js:`);
    console.log(`    {`);
    console.log(`      username: '${usuario}',`);
    console.log(`      displayName: '${usuario}',`);
    console.log(`      role: 'user',`);
    console.log(`      passwordHash: '${novoHash}',`);
    console.log(`      createdAt: '${new Date().toISOString().slice(0, 10)}'`);
    console.log(`    },\n`);
  }
  process.exit(0);
}

// Se não passou comando válido
console.log('\nComandos disponíveis:\n');
console.log('1. Listar usuários cadastrados:');
console.log('   node scripts/gerenciar_senhas.js listar\n');
console.log('2. Conferir/Testar se você sabe a senha atual:');
console.log('   node scripts/gerenciar_senhas.js conferir <usuario> <senha>\n');
console.log('3. Gerar hash para alterar ou definir nova senha:');
console.log('   node scripts/gerenciar_senhas.js alterar <usuario> <nova_senha>\n');
