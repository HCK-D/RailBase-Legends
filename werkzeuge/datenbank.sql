-- RailBase Legends: Datenbank in Supabase (Projekt ilxtsqfbsejrjgfxkxdf)
-- Einmal im Supabase SQL Editor einfügen und «Run» drücken. Nochmals ausführen schadet nicht:
-- Tabellen werden nur angelegt, wenn sie fehlen, Regeln und Funktionen werden ersetzt.
--
-- Einstellungen im Projekt: Data API an, «Automatically expose new tables» aus, «Automatic RLS» an,
-- Authentication: «Allow anonymous sign-ins» an. Darum gibt diese Datei jedes Recht einzeln frei.
-- Jeder Spieler darf nur seinen eigenen Eintrag lesen und ändern. Was zwei Spieler betrifft
-- (Tausch, Geschenk, Profil eines Freundes), geht nur über die Funktionen unten, die alles prüfen.

-- ---------- Spieler: ein Eintrag pro Konto, der ganze Spielstand als JSON ----------
create table if not exists public.spieler (
  id uuid primary key references auth.users (id) on delete cascade,
  spieler_id text not null unique check (spieler_id ~ '^RB-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  name text not null default '' check (char_length(name) <= 30),
  titel text not null default '' check (char_length(titel) <= 40),
  level integer not null default 1,
  stand jsonb not null default '{}'::jsonb check (pg_column_size(stand) < 500000),
  geaendert timestamptz not null default now()
);

alter table public.spieler enable row level security;

drop policy if exists "spieler_lesen" on public.spieler;
drop policy if exists "spieler_anlegen" on public.spieler;
drop policy if exists "spieler_aendern" on public.spieler;
create policy "spieler_lesen" on public.spieler for select to authenticated using (id = auth.uid());
create policy "spieler_anlegen" on public.spieler for insert to authenticated with check (id = auth.uid());
create policy "spieler_aendern" on public.spieler for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.spieler from anon, authenticated;
grant select, insert, update on public.spieler to authenticated;

-- ---------- Tausch-Anfragen ----------
create table if not exists public.tausch_anfragen (
  id bigint generated always as identity primary key,
  von uuid not null references public.spieler (id) on delete cascade,
  an uuid not null references public.spieler (id) on delete cascade,
  von_id text not null,
  an_id text not null,
  gibt text not null check (gibt ~ '^(RB|V|S)[0-9]{2,3}$'),
  will text not null check (will ~ '^(RB|V|S)[0-9]{2,3}$'),
  status text not null default 'offen'
    check (status in ('offen', 'angenommen', 'abgelehnt', 'zurueckgezogen', 'abgelaufen', 'ungueltig')),
  zeit timestamptz not null default now(),
  beantwortet timestamptz
);

create index if not exists tausch_anfragen_von on public.tausch_anfragen (von, zeit desc);
create index if not exists tausch_anfragen_an on public.tausch_anfragen (an, zeit desc);

alter table public.tausch_anfragen enable row level security;

drop policy if exists "tausch_lesen" on public.tausch_anfragen;
create policy "tausch_lesen" on public.tausch_anfragen for select to authenticated
  using (von = auth.uid() or an = auth.uid());

revoke all on public.tausch_anfragen from anon, authenticated;
grant select on public.tausch_anfragen to authenticated;

-- ---------- Geschenke (ein Pack für einen Freund) ----------
create table if not exists public.geschenke (
  id bigint generated always as identity primary key,
  von uuid not null references public.spieler (id) on delete cascade,
  an uuid not null references public.spieler (id) on delete cascade,
  von_id text not null,
  pack text not null check (pack in ('standard', 'silber-1', 'silber-2', 'gold-1', 'gold-2', 'platin-1', 'platin-2')),
  zeit timestamptz not null default now(),
  abgeholt timestamptz
);

create index if not exists geschenke_an on public.geschenke (an, abgeholt);
create index if not exists geschenke_von on public.geschenke (von, zeit desc);

alter table public.geschenke enable row level security;

drop policy if exists "geschenke_lesen" on public.geschenke;
create policy "geschenke_lesen" on public.geschenke for select to authenticated
  using (von = auth.uid() or an = auth.uid());

revoke all on public.geschenke from anon, authenticated;
grant select on public.geschenke to authenticated;

-- ---------- Hilfen ----------

-- Wie oft eine Karte im Spielstand vorkommt (stand.karten ist eine Liste von Karten-IDs, doppelte mehrfach)
create or replace function public.anzahl_karten(stand jsonb, karte text)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(*)::integer
  from jsonb_array_elements_text(
    case when jsonb_typeof(stand -> 'karten') = 'array' then stand -> 'karten' else '[]'::jsonb end
  ) as e(id)
  where e.id = karte
$$;

-- Steht diese Freunde-ID in der Freundesliste des Spielstands?
create or replace function public.ist_freund(stand jsonb, freund text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_typeof(stand -> 'freunde') = 'array' and (stand -> 'freunde') ? freund, false)
$$;

revoke all on function public.anzahl_karten(jsonb, text) from public, anon, authenticated;
revoke all on function public.ist_freund(jsonb, text) from public, anon, authenticated;

-- ---------- Profile von Freunden: nur Name, Titel und Level ----------
create or replace function public.profile_von(ids text[])
returns table (spieler_id text, name text, titel text, level integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.spieler_id, s.name, s.titel, s.level
  from public.spieler s
  where s.spieler_id = any (ids[1:200])
$$;

-- ---------- Sammlung eines Freundes zum Tauschen: seine doppelten Karten und seine Wunschliste ----------
create or replace function public.sammlung_von(freund text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ich public.spieler;
  er public.spieler;
begin
  select * into ich from public.spieler where id = auth.uid();
  if ich.id is null then
    raise exception 'Dein Konto ist noch nicht bereit.';
  end if;
  if not public.ist_freund(ich.stand, freund) then
    raise exception 'Das geht nur bei deinen Freunden.';
  end if;
  select * into er from public.spieler where spieler_id = freund;
  if er.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'doppelte', coalesce((
      select jsonb_agg(d.id)
      from (
        select e.id
        from jsonb_array_elements_text(
          case when jsonb_typeof(er.stand -> 'karten') = 'array' then er.stand -> 'karten' else '[]'::jsonb end
        ) as e(id)
        group by e.id
        having count(*) >= 2
      ) as d
    ), '[]'::jsonb),
    'wunschliste', case when jsonb_typeof(er.stand -> 'wunschliste') = 'array' then er.stand -> 'wunschliste' else '[]'::jsonb end,
    'name', er.name
  );
end
$$;

-- ---------- Tauschen ----------

-- Anfrage senden: du gibst karte_gibt (doppelt), dein Freund gibt karte_will (bei ihm doppelt)
create or replace function public.tausch_senden(freund text, karte_gibt text, karte_will text)
returns public.tausch_anfragen
language plpgsql
security definer
set search_path = public
as $$
declare
  ich public.spieler;
  er public.spieler;
  neu public.tausch_anfragen;
begin
  select * into ich from public.spieler where id = auth.uid();
  if ich.id is null then
    raise exception 'Dein Konto ist noch nicht bereit.';
  end if;
  if not public.ist_freund(ich.stand, freund) then
    raise exception 'Tauschen geht nur mit deinen Freunden.';
  end if;
  select * into er from public.spieler where spieler_id = freund;
  if er.id is null then
    raise exception 'Diese Freunde-ID gibt es nicht.';
  end if;
  if er.id = ich.id then
    raise exception 'Mit dir selbst kannst du nicht tauschen.';
  end if;
  if karte_gibt = karte_will then
    raise exception 'Das ist dieselbe Karte.';
  end if;
  if public.anzahl_karten(ich.stand, karte_gibt) < 2 then
    raise exception 'Du hast diese Karte nicht doppelt.';
  end if;
  if public.anzahl_karten(er.stand, karte_will) < 2 then
    raise exception 'Dein Freund hat diese Karte nicht mehr doppelt.';
  end if;
  if (select count(*) from public.tausch_anfragen t
      where t.von = ich.id and t.status = 'offen' and t.zeit > now() - interval '48 hours') >= 3 then
    raise exception 'Du hast schon 3 offene Anfragen.';
  end if;
  insert into public.tausch_anfragen (von, an, von_id, an_id, gibt, will)
  values (ich.id, er.id, ich.spieler_id, er.spieler_id, karte_gibt, karte_will)
  returning * into neu;
  return neu;
end
$$;

-- Antworten: nur der Empfänger. Annehmen prüft beide Sammlungen und gilt dann für beide gleichzeitig;
-- jedes Spiel setzt den Tausch danach genau einmal in seinem Spielstand um.
create or replace function public.tausch_antworten(anfrage bigint, annehmen boolean)
returns public.tausch_anfragen
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.tausch_anfragen;
  von_stand jsonb;
  an_stand jsonb;
begin
  select * into a from public.tausch_anfragen where id = anfrage for update;
  if a.id is null or a.an <> auth.uid() then
    raise exception 'Diese Anfrage gibt es nicht.';
  end if;
  if a.status <> 'offen' then
    return a;
  end if;
  if a.zeit < now() - interval '48 hours' then
    update public.tausch_anfragen set status = 'abgelaufen', beantwortet = now() where id = a.id returning * into a;
    return a;
  end if;
  if not annehmen then
    update public.tausch_anfragen set status = 'abgelehnt', beantwortet = now() where id = a.id returning * into a;
    return a;
  end if;
  select stand into von_stand from public.spieler where id = a.von;
  select stand into an_stand from public.spieler where id = a.an;
  if public.anzahl_karten(von_stand, a.gibt) < 2 or public.anzahl_karten(an_stand, a.will) < 2 then
    update public.tausch_anfragen set status = 'ungueltig', beantwortet = now() where id = a.id returning * into a;
    return a;
  end if;
  update public.tausch_anfragen set status = 'angenommen', beantwortet = now() where id = a.id returning * into a;
  return a;
end
$$;

-- Zurückziehen: nur der Absender, solange die Anfrage offen ist
create or replace function public.tausch_zurueckziehen(anfrage bigint)
returns public.tausch_anfragen
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.tausch_anfragen;
begin
  update public.tausch_anfragen set status = 'zurueckgezogen', beantwortet = now()
  where id = anfrage and von = auth.uid() and status = 'offen'
  returning * into a;
  if a.id is null then
    raise exception 'Diese Anfrage ist nicht mehr offen.';
  end if;
  return a;
end
$$;

-- ---------- Geschenke ----------

-- Ein Pack einem Freund schenken (höchstens alle 48 Stunden). Die Coins zieht das Spiel selbst ab.
create or replace function public.geschenk_senden(freund text, pack_id text)
returns public.geschenke
language plpgsql
security definer
set search_path = public
as $$
declare
  ich public.spieler;
  er public.spieler;
  neu public.geschenke;
begin
  select * into ich from public.spieler where id = auth.uid();
  if ich.id is null then
    raise exception 'Dein Konto ist noch nicht bereit.';
  end if;
  if not public.ist_freund(ich.stand, freund) then
    raise exception 'Schenken geht nur an deine Freunde.';
  end if;
  select * into er from public.spieler where spieler_id = freund;
  if er.id is null then
    raise exception 'Diese Freunde-ID gibt es nicht.';
  end if;
  if er.id = ich.id then
    raise exception 'Dir selbst kannst du nichts schenken.';
  end if;
  if exists (select 1 from public.geschenke g where g.von = ich.id and g.zeit > now() - interval '48 hours') then
    raise exception 'Du kannst nur alle 48 Stunden ein Pack verschenken.';
  end if;
  insert into public.geschenke (von, an, von_id, pack) values (ich.id, er.id, ich.spieler_id, pack_id)
  returning * into neu;
  return neu;
end
$$;

-- Geschenk abholen: gibt das Geschenk genau einmal zurück, danach null
create or replace function public.geschenk_abholen(geschenk bigint)
returns public.geschenke
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.geschenke;
begin
  update public.geschenke set abgeholt = now()
  where id = geschenk and an = auth.uid() and abgeholt is null
  returning * into g;
  return g;
end
$$;

-- ---------- Wer die Funktionen aufrufen darf: nur angemeldete Spieler (auch automatische Konten) ----------
revoke all on function public.profile_von(text[]) from public, anon;
revoke all on function public.sammlung_von(text) from public, anon;
revoke all on function public.tausch_senden(text, text, text) from public, anon;
revoke all on function public.tausch_antworten(bigint, boolean) from public, anon;
revoke all on function public.tausch_zurueckziehen(bigint) from public, anon;
revoke all on function public.geschenk_senden(text, text) from public, anon;
revoke all on function public.geschenk_abholen(bigint) from public, anon;

grant execute on function public.profile_von(text[]) to authenticated;
grant execute on function public.sammlung_von(text) to authenticated;
grant execute on function public.tausch_senden(text, text, text) to authenticated;
grant execute on function public.tausch_antworten(bigint, boolean) to authenticated;
grant execute on function public.tausch_zurueckziehen(bigint) to authenticated;
grant execute on function public.geschenk_senden(text, text) to authenticated;
grant execute on function public.geschenk_abholen(bigint) to authenticated;
