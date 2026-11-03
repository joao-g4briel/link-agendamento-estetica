-- Esquema do banco da HC Estética Automotiva (Postgres / Neon).
-- Pode rodar mais de uma vez: só cria o que ainda não existe.

create table if not exists config (
  id          int primary key default 1 check (id = 1),
  settings    jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists servicos (
  id               text primary key,
  name             text not null,
  description      text not null default '',
  duration_min     int  not null check (duration_min between 15 and 720),
  price_cents      int  not null check (price_cents >= 0),
  price_from       boolean not null default false,
  return_interval  text,              -- "15d", "6m", "12m"...
  return_action    text not null default '',
  active           boolean not null default true,
  ordem            int  not null default 0
);

create table if not exists clientes (
  id          text primary key,
  name        text not null,
  phone       text not null unique,   -- só dígitos, sem o 55
  created_at  date not null
);

create table if not exists agendamentos (
  id              text primary key,
  code            text not null,
  customer_id     text not null references clientes(id),
  service_id      text not null references servicos(id),
  date            date not null,
  start           text not null,      -- "HH:MM", horário de chegada
  duration_min    int  not null,
  price_cents     int  not null,
  vehicle         text not null,
  plate           text not null default '',
  notes           text not null default '',
  status          text not null check (status in ('agendado', 'concluido', 'faltou', 'cancelado')),
  source          text not null,      -- link, painel ou retorno
  created_at      date not null,
  completed_at    date,
  auto_completed  boolean not null default false
);
create index if not exists agendamentos_data on agendamentos (date);
create index if not exists agendamentos_cliente on agendamentos (customer_id);

create table if not exists retornos (
  id                     text primary key,
  token                  text not null unique,
  customer_id            text not null references clientes(id),
  service_id             text not null references servicos(id),
  appointment_id         text,
  vehicle                text not null default '',
  plate                  text not null default '',
  service_date           date not null,
  due_date               date not null,
  status                 text not null check (status in ('pendente', 'avisado', 'reagendado', 'descartado')),
  notified_at            date,
  booked_appointment_id  text,
  created_at             date not null
);
create index if not exists retornos_vencimento on retornos (status, due_date);

create table if not exists folgas (
  id         text primary key,
  date_from  date not null,
  date_to    date not null,
  reason     text not null default 'folga'
);

-- Migração aditiva: mantém o histórico e dispensa duração nos novos registros.
alter table servicos alter column duration_min drop not null;
alter table agendamentos alter column duration_min drop not null;
alter table clientes alter column phone drop not null;
create table if not exists veiculos (
  id text primary key, customer_id text not null references clientes(id), vehicle text not null, plate text not null default ''
);
alter table agendamentos add column if not exists vehicle_id text references veiculos(id);
alter table agendamentos add column if not exists customer_name text;
alter table agendamentos add column if not exists idempotency_key text;
alter table agendamentos add column if not exists request_fingerprint text;
alter table agendamentos add column if not exists manage_token text;
alter table retornos add column if not exists vehicle_id text references veiculos(id);
create unique index if not exists agendamentos_idempotency on agendamentos(idempotency_key) where idempotency_key is not null;
create unique index if not exists agendamentos_manage on agendamentos(manage_token) where manage_token is not null;
alter table agendamentos drop constraint if exists agendamentos_status_check;
alter table agendamentos add constraint agendamentos_status_check check (status in ('agendado','confirmado','recebido','em_servico','pronto','concluido','faltou','cancelado'));

-- Sem placa, cada atendimento antigo ganha identidade própria, sem fusão por nome.
insert into veiculos(id, customer_id, vehicle, plate)
select 'car-legado-' || min(a.id), a.customer_id, min(a.vehicle), a.plate from agendamentos a
where a.vehicle_id is null and a.plate <> ''
  and not exists (select 1 from veiculos v where v.customer_id = a.customer_id and v.plate = a.plate)
group by a.customer_id, a.plate
on conflict (id) do nothing;
update agendamentos a set vehicle_id = v.id from veiculos v
where a.vehicle_id is null and a.plate <> '' and v.customer_id = a.customer_id and v.plate = a.plate;
insert into veiculos(id, customer_id, vehicle, plate)
select 'car-legado-' || id, customer_id, vehicle, plate from agendamentos where vehicle_id is null
on conflict (id) do nothing;
update agendamentos set vehicle_id = 'car-legado-' || id where vehicle_id is null;
update retornos r set vehicle_id = a.vehicle_id from agendamentos a where r.vehicle_id is null and r.appointment_id = a.id;
update agendamentos a set customer_name = c.name from clientes c where a.customer_id = c.id and a.customer_name is null;

create table if not exists eventos (
  id text primary key, action text not null, target_id text not null, detail jsonb not null default '{}', at text not null
);
create table if not exists espera (
  id text primary key, name text not null, phone text not null, service_id text not null references servicos(id),
  vehicle text not null default '', status text not null default 'pendente', created_at date not null
);
create table if not exists seguranca (
  key text primary key, value jsonb not null, expires_at timestamptz not null
);
create index if not exists seguranca_expira on seguranca(expires_at);

-- Migração aditiva: preço por porte (P/M/G) e adicional opcional por serviço.
-- Sem esses dados, o serviço segue com o preço único de price_cents.
alter table servicos add column if not exists prices_by_size jsonb;
alter table servicos add column if not exists addon jsonb;
alter table veiculos add column if not exists size text check (size in ('P', 'M', 'G'));
alter table agendamentos add column if not exists size text check (size in ('P', 'M', 'G'));
alter table agendamentos add column if not exists addon_name text;
alter table agendamentos add column if not exists addon_cents int not null default 0 check (addon_cents >= 0);
