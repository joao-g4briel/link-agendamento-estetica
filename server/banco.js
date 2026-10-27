// Ponte entre o Postgres (Neon) e o retrato em memória usado pelas regras.
// Cada requisição: abre transação, trava (uma estética = uma fila), carrega,
// roda a regra, grava só as linhas que mudaram e confirma.

import { Pool, types } from '@neondatabase/serverless';

// Datas do Postgres chegam como "AAAA-MM-DD" (texto), igual ao resto do sistema.
types.setTypeParser(1082, (value) => value);

// Coluna do banco ↔ campo do objeto, por tabela. A ordem importa para gravar
// (pais antes dos filhos) e para apagar (filhos antes dos pais).
const TABLES = [
  ['services', 'servicos', {
    id: 'id', name: 'name', description: 'description', durationMin: 'duration_min', priceCents: 'price_cents',
    priceFrom: 'price_from', returnInterval: 'return_interval', returnAction: 'return_action', active: 'active', order: 'ordem',
  }],
  ['customers', 'clientes', { id: 'id', name: 'name', phone: 'phone', createdAt: 'created_at' }],
  ['appointments', 'agendamentos', {
    id: 'id', code: 'code', customerId: 'customer_id', serviceId: 'service_id', date: 'date', start: 'start',
    durationMin: 'duration_min', priceCents: 'price_cents', vehicle: 'vehicle', plate: 'plate', notes: 'notes',
    status: 'status', source: 'source', createdAt: 'created_at', completedAt: 'completed_at', autoCompleted: 'auto_completed',
  }],
  ['returns', 'retornos', {
    id: 'id', token: 'token', customerId: 'customer_id', serviceId: 'service_id', appointmentId: 'appointment_id',
    vehicle: 'vehicle', plate: 'plate', serviceDate: 'service_date', dueDate: 'due_date', status: 'status',
    notifiedAt: 'notified_at', bookedAppointmentId: 'booked_appointment_id', createdAt: 'created_at',
  }],
  ['blocks', 'folgas', { id: 'id', from: 'date_from', to: 'date_to', reason: 'reason' }],
];

const LOCK_KEY = 4190419; // trava única da estética

function toObject(row, map) {
  const out = {};
  for (const [field, column] of Object.entries(map)) out[field] = row[column] ?? null;
  return out;
}

async function load(client) {
  const db = {};
  const config = await client.query('select settings from config where id = 1');
  if (!config.rows.length) throw new Error('Banco sem configuração. Rode "npm run banco" para criar e preencher.');
  db.settings = config.rows[0].settings;
  for (const [key, table, map] of TABLES) {
    const { rows } = await client.query(`select * from ${table}`);
    db[key] = rows.map((row) => toObject(row, map));
  }
  return db;
}

function index(list) {
  return new Map(list.map((item) => [item.id, JSON.stringify(item)]));
}

async function save(client, before, after) {
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) {
    await client.query('update config set settings = $1, updated_at = now() where id = 1', [after.settings]);
  }
  const removals = [];
  for (const [key, table, map] of TABLES) {
    const old = before.index[key];
    const columns = Object.values(map);
    const fields = Object.keys(map);
    for (const item of after[key]) {
      if (old.get(item.id) === JSON.stringify(item)) continue;
      const values = fields.map((f) => item[f] ?? null);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const updates = columns.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
      await client.query(
        `insert into ${table} (${columns.join(', ')}) values (${placeholders}) on conflict (id) do update set ${updates}`,
        values,
      );
    }
    const keep = new Set(after[key].map((item) => item.id));
    const gone = [...old.keys()].filter((id) => !keep.has(id));
    if (gone.length) removals.push([table, gone]);
  }
  for (const [table, ids] of removals.reverse()) {
    await client.query(`delete from ${table} where id = any($1)`, [ids]);
  }
}

let pool;
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
  pool ||= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

/** Roda `fn(db)` numa transação travada e grava o que mudou. */
export async function withDb(fn) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock($1)', [LOCK_KEY]);
    const db = await load(client);
    const before = {
      settings: JSON.parse(JSON.stringify(db.settings)),
      index: Object.fromEntries(TABLES.map(([key]) => [key, index(db[key])])),
    };
    const result = await fn(db);
    await save(client, before, db);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function rawQuery(sql, params) {
  const client = await getPool().connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
