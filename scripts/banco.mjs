// Cria as tabelas no Neon e preenche os dados iniciais (só se o banco estiver vazio).
// Uso: npm run banco   (lê DATABASE_URL do .env.local)

import { readFile } from 'node:fs/promises';
import { rawQuery } from '../server/banco.js';
import { SERVICES, SETTINGS } from '../server/inicial.js';

const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
await rawQuery(schema);
console.log('Tabelas criadas/conferidas.');

const { rows } = await rawQuery('select count(*)::int as n from config');
if (rows[0].n === 0) {
  await rawQuery('insert into config (id, settings) values (1, $1)', [SETTINGS]);
  for (const s of SERVICES) {
    await rawQuery(
      `insert into servicos (id, name, description, price_cents, price_from, return_interval, return_action, active, ordem)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (id) do nothing`,
      [s.id, s.name, s.description, s.priceCents, s.priceFrom, s.returnInterval, s.returnAction, s.active, s.order],
    );
  }
  console.log(`Configuração da ${SETTINGS.name} e ${SERVICES.length} serviços de exemplo inseridos.`);
} else {
  console.log('O banco já tinha configuração: nada foi sobrescrito.');
}
process.exit(0);
