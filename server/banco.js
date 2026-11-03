// Ponte entre o Postgres (Neon) e o retrato em memória usado pelas regras.
// Cada requisição: abre transação, trava (uma estética = uma fila), carrega,
// roda a regra, grava só as linhas que mudaram e confirma.

import { Pool, types } from '@neondatabase/serverless';
import { localStore } from './local-store.mjs';

// Datas do Postgres chegam como "AAAA-MM-DD" (texto), igual ao resto do sistema.
types.setTypeParser(1082, (value) => value);

// Coluna do banco ↔ campo do objeto, por tabela. A ordem importa para gravar
// (pais antes dos filhos) e para apagar (filhos antes dos pais).
const TABLES = [
  ['services', 'servicos', {
    id: 'id', name: 'name', description: 'description', priceCents: 'price_cents',
    priceFrom: 'price_from', returnInterval: 'return_interval', returnAction: 'return_action', active: 'active', order: 'ordem',
  }],
  ['customers', 'clientes', { id: 'id', name: 'name', phone: 'phone', createdAt: 'created_at' }],
  ['vehicles', 'veiculos', { id: 'id', customerId: 'customer_id', vehicle: 'vehicle', plate: 'plate' }],
  ['appointments', 'agendamentos', {
    id: 'id', code: 'code', customerId: 'customer_id', serviceId: 'service_id', date: 'date', start: 'start',
    priceCents: 'price_cents', vehicle: 'vehicle', plate: 'plate', notes: 'notes', vehicleId: 'vehicle_id', customerName: 'customer_name',
    idempotencyKey: 'idempotency_key', requestFingerprint: 'request_fingerprint', manageToken: 'manage_token',
    status: 'status', source: 'source', createdAt: 'created_at', completedAt: 'completed_at', autoCompleted: 'auto_completed',
  }],
  ['returns', 'retornos', {
    id: 'id', token: 'token', customerId: 'customer_id', serviceId: 'service_id', appointmentId: 'appointment_id',
    vehicle: 'vehicle', plate: 'plate', serviceDate: 'service_date', dueDate: 'due_date', status: 'status',
    notifiedAt: 'notified_at', bookedAppointmentId: 'booked_appointment_id', createdAt: 'created_at',
    vehicleId: 'vehicle_id',
  }],
  ['blocks', 'folgas', { id: 'id', from: 'date_from', to: 'date_to', reason: 'reason' }],
  ['events', 'eventos', { id: 'id', action: 'action', targetId: 'target_id', detail: 'detail', at: 'at' }],
  ['waitlist', 'espera', { id: 'id', name: 'name', phone: 'phone', serviceId: 'service_id', vehicle: 'vehicle', status: 'status', createdAt: 'created_at' }],
];

const LOCK_KEY = 4190419; // trava única da estética

function toObject(row, map) {
  const out = {};
  for (const [field, column] of Object.entries(map)) out[field] = row[column] ?? null;
  return out;
}

async function load(client, { publicOnly = false, tables, inviteToken, customerId, customerList } = {}) {
  const db = {};
  const config = await client.query('select settings from config where id = 1');
  if (!config.rows.length) throw new Error('Banco sem configuração. Rode "npm run banco" para criar e preencher.');
  db.settings = config.rows[0].settings;
  const customerFilter = `($1 = '' or c.name ilike $2 or c.phone ilike $2 or exists (select 1 from agendamentos a where a.customer_id = c.id and (a.vehicle ilike $2 or replace(a.plate, '-', '') ilike replace($2, '-', ''))))`;
  const pageQuery = `select c.id from clientes c where ${customerFilter} order by c.name, c.id limit 50 offset $3`;
  let pageParams;
  if (customerList) {
    const q = String(customerList.query || '').trim().slice(0, 100);
    pageParams = [q, `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`, Math.max(0, Math.floor(Number(customerList.offset)) || 0)];
    const total = await client.query(`select count(*)::int as total from clientes c where ${customerFilter}`, pageParams.slice(0, 2));
    db.customerPage = { total: total.rows[0].total, offset: pageParams[2] };
  }
  for (const [key, table, map] of TABLES) {
    if ((publicOnly && !['services', 'appointments', 'blocks'].includes(key)) || (tables && !tables.includes(key))) { db[key] = []; continue; }
    let where = '';
    let params = [];
    if (publicOnly && key === 'appointments') where = " where date >= (now() at time zone 'America/Sao_Paulo')::date and date <= (now() at time zone 'America/Sao_Paulo')::date + 90";
    if (inviteToken && key === 'returns') { where = ' where token = $1'; params = [inviteToken]; }
    if (inviteToken && key === 'customers') { where = ' where id in (select customer_id from retornos where token = $1)'; params = [inviteToken]; }
    if (customerId && ['customers', 'vehicles', 'appointments', 'returns'].includes(key)) { where = ` where ${key === 'customers' ? 'id' : 'customer_id'} = $1`; params = [customerId]; }
    if (customerList && ['customers', 'vehicles', 'appointments', 'returns'].includes(key)) { where = ` where ${key === 'customers' ? 'id' : 'customer_id'} in (${pageQuery})`; params = pageParams; }
    const { rows } = await client.query(`select ${Object.values(map).join(', ')} from ${table}${where}`, params);
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
export async function withDb(fn, options = {}) {
  if (process.env.STORE_MODE === 'local') return localStore(fn, options);
  const client = await getPool().connect();
  try {
    await client.query(options.readOnly ? 'begin isolation level repeatable read read only' : 'begin');
    if (!options.readOnly) await client.query('select pg_advisory_xact_lock($1)', [LOCK_KEY]);
    const db = await load(client, options);
    const before = {
      settings: JSON.parse(JSON.stringify(db.settings)),
      index: Object.fromEntries(TABLES.map(([key]) => [key, index(db[key])])),
    };
    const result = await fn(db);
    if (!options.readOnly) await save(client, before, db);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function securityState(key, fn) {
  if (process.env.STORE_MODE === 'local') return localStore(db => {
    db.security ||= {};
    const state = db.security[key] || {};
    const result = fn(state);
    db.security[key] = state;
    const now = Date.now();
    for (const [k, value] of Object.entries(db.security)) if ((value.expires || value.reset || Infinity) < now) delete db.security[k];
    return result;
  });
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [key]);
    const { rows } = await client.query('select value from seguranca where key = $1', [key]);
    const state = rows[0]?.value || {};
    const result = fn(state);
    await client.query('insert into seguranca (key, value, expires_at) values ($1, $2, $3) on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at', [key, state, new Date(state.expires || state.reset || Date.now() + 86400000)]);
    await client.query('delete from seguranca where expires_at < now()');
    await client.query('commit');
    return result;
  } catch (e) { await client.query('rollback').catch(() => {}); throw e; }
  finally { client.release(); }
}

export async function rawQuery(sql, params) {
  const client = await getPool().connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
