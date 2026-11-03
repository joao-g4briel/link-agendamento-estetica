// Servidor de validação: nunca usa DATABASE_URL, mesmo se estiver no .env.local.
process.env.STORE_MODE = 'local';
process.env.LOCAL_DATA_FILE = '.local/validacao.json';
process.env.PORT ||= '5173';
if (!process.env.PAINEL_SENHA) throw new Error('Defina PAINEL_SENHA no .env.local antes de iniciar.');
console.log('VALIDAÇÃO LOCAL: dados persistidos em .local/validacao.json; produção não é acessada.');
await import('./preparar-local.mjs');
await import('../server.mjs');
