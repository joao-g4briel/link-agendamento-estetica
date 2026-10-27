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
