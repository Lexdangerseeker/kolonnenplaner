create extension if not exists "pgcrypto";
create table if not exists public.mitarbeiter (
  id uuid primary key default gen_random_uuid(),
  nachname text, name text,
  telefon text, email text,
  strasse text, hausnummer text, plz text, ort text,
  steuernummer text, iban text, bic text, bank_name text, kontoinhaber text,
  fuehrerschein_klassen text[],
  fuehrerschein_gueltig_bis date,
  geburtsdatum date,
  notfall_name text, notfall_tel text,
  notizen text,
  aktiv boolean not null default true,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  pin text,
  pin_hash text,
  pin_updated_at timestamptz,
  pin_set boolean generated always as (pin_hash is not null) stored
);
insert into public.mitarbeiter (nachname,name,aktiv) values ('Jansen','Daniel Jansen',true) on conflict do nothing;
