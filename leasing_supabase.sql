-- Script SQL para Supabase: esquema LEASING
-- Pegar y ejecutar en el editor SQL de Supabase.

create extension if not exists pgcrypto;

create sequence if not exists public.leasing_materiales_seq start with 1 increment by 1;
create sequence if not exists public.leasing_materiales_codigo_seq start with 9000000000 increment by 1;
create sequence if not exists public.leasing_movimientos_seq start with 1 increment by 1;
create sequence if not exists public.leasing_modif_movim_seq start with 1 increment by 1;

create or replace function public.leasing_next_prefixed_id(
  seq_name text,
  prefijo text,
  digits integer
)
returns text
language plpgsql
as $$
declare
  next_value bigint;
begin
  execute format('select nextval(%L)', seq_name) into next_value;
  return prefijo || lpad(next_value::text, digits, '0');
end;
$$;

create or replace function public.leasing_set_materiales_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.id is null or new.id = '' then
    new.id := public.leasing_next_prefixed_id('public.leasing_materiales_seq', 'L', 4);
  end if;

  if new.codigo is null then
    new.codigo := nextval('public.leasing_materiales_codigo_seq');
  end if;

  if new.estado is null then
    new.estado := 1;
  end if;

  if new.modif is null then
    new.modif := 0;
  end if;

  return new;
end;
$$;

create or replace function public.leasing_set_movimientos_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.id is null or new.id = '' then
    new.id := public.leasing_next_prefixed_id('public.leasing_movimientos_seq', 'M', 4);
  end if;

  if new.date_crea is null then
    new.date_crea := current_date;
  end if;

  if new.edit is null then
    new.edit := 0;
  end if;

  if new.estado is null then
    new.estado := 1;
  end if;

  return new;
end;
$$;

create or replace function public.leasing_set_modif_movim_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.id is null or new.id = '' then
    new.id := public.leasing_next_prefixed_id('public.leasing_modif_movim_seq', 'MM', 4);
  end if;

  if new.date_modif is null then
    new.date_modif := current_date;
  end if;

  return new;
end;
$$;

create table if not exists public.tipo_movimiento (
  codigo integer primary key,
  descripcion text not null unique
);

create table if not exists public.materiales (
  id text primary key,
  codigo bigint not null unique check (codigo between 1000000000 and 9999999999),
  descripcion text not null,
  referencia text,
  ubicacion text,
  placa bigint check (placa is null or placa between 100000000 and 999999999),
  estado smallint not null default 1 check (estado in (0, 1)),
  date_elim date,
  modif smallint not null default 0 check (modif in (0, 1)),
  id_modif text
);

create table if not exists public.movimientos (
  id text primary key,
  codigo_material text not null references public.materiales (id),
  date_movi date not null,
  date_crea date not null default current_date,
  tipo_movimiento integer not null references public.tipo_movimiento (codigo),
  guia text,
  ubic_destino text,
  placa bigint check (placa is null or placa between 100000000 and 999999999),
  responsable text not null,
  destinatario text,
  obs text,
  edit smallint not null default 0 check (edit in (0, 1)),
  id_modif text,
  estado smallint not null default 1 check (estado in (0, 1)),
  date_elim date
);

create table if not exists public.modif_movim (
  id text primary key,
  id_movimiento text not null references public.movimientos (id),
  date_modif date not null default current_date,
  codigo_material text not null references public.materiales (id),
  date_movi date,
  date_crea date,
  tipo_movimiento integer references public.tipo_movimiento (codigo),
  guia text,
  ubic_destino text,
  placa bigint,
  responsable text,
  destinatario text,
  obs text
);

create table if not exists public.estado (
  id text primary key references public.materiales (id) on delete cascade,
  mov integer not null default 101 references public.tipo_movimiento (codigo)
);

create index if not exists idx_movimientos_codigo_material on public.movimientos (codigo_material);
create index if not exists idx_movimientos_tipo_movimiento on public.movimientos (tipo_movimiento);
create index if not exists idx_modif_movim_id_movimiento on public.modif_movim (id_movimiento);
create index if not exists idx_estado_mov on public.estado (mov);

drop trigger if exists trg_leasing_materiales_defaults on public.materiales;
create trigger trg_leasing_materiales_defaults
before insert on public.materiales
for each row execute function public.leasing_set_materiales_defaults();

drop trigger if exists trg_leasing_movimientos_defaults on public.movimientos;
create trigger trg_leasing_movimientos_defaults
before insert on public.movimientos
for each row execute function public.leasing_set_movimientos_defaults();

drop trigger if exists trg_leasing_modif_movim_defaults on public.modif_movim;
create trigger trg_leasing_modif_movim_defaults
before insert on public.modif_movim
for each row execute function public.leasing_set_modif_movim_defaults();

insert into public.tipo_movimiento (codigo, descripcion)
values
  (101, 'INGRESO'),
  (201, 'SALIDA'),
  (301, 'MODIFICAR'),
  (401, 'ELIMINAR')
on conflict (codigo) do update
set descripcion = excluded.descripcion;

-- Nota:
-- materiales.id_modif queda sin FK porque no se definio la tabla modif_mater en la lista inicial.
-- Si luego la agregas, se puede cambiar este campo a una referencia formal.
