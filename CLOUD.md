# Cloudová databáze (Supabase) — nastavení

Aplikace OOPP umí mít společnou databázi v cloudu: tablet v dílně i počítač
v kanceláři pak vidí **stejné zaměstnance, předměty, funkce/pozice, výdeje
i obrázky podpisů**. Každé zařízení má navíc svou lokální kopii, takže se
dá pracovat i bez internetu (změny se doplní po připojení).

Doporučený poskytovatel: **Supabase** — zdarma, 500 MB databáze
(1 podpis ≈ 8 kB, takže tisíce výdejů).

## 1. Založení projektu

1. <https://supabase.com> → *Sign in* → **New project**
2. Project name: `oopp`, Database password: libovolné (uložte si ho),
   Region: **Central EU (Frankfurt)**
3. Počkejte ~1 minutu, než se projekt vytvoří.

## 2. Vytvoření tabulek

V Supabase otevřete **SQL Editor → New query**, vložte celý SQL níže
a klikněte **Run**.

```sql
-- 1) seznamy: zaměstnanci, předměty, funkce/pozice, výdeje (jeden dokument)
create table if not exists public.oopp (
  doc_id     text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) obrázky podpisů: jeden řádek = jeden podpis
create table if not exists public.oopp_sig (
  issue_id   text primary key,
  data       text not null,
  updated_at timestamptz not null default now()
);

alter table public.oopp     enable row level security;
alter table public.oopp_sig enable row level security;

-- aplikace používá klíč "anon" – přístup povolte jen jí
drop policy if exists oopp_read   on public.oopp;
drop policy if exists oopp_insert on public.oopp;
drop policy if exists oopp_update on public.oopp;
drop policy if exists oopp_delete on public.oopp;
create policy oopp_read   on public.oopp for select using (true);
create policy oopp_insert on public.oopp for insert with check (true);
create policy oopp_update on public.oopp for update using (true) with check (true);
create policy oopp_delete on public.oopp for delete using (true);

drop policy if exists sig_read   on public.oopp_sig;
drop policy if exists sig_insert on public.oopp_sig;
drop policy if exists sig_update on public.oopp_sig;
drop policy if exists sig_delete on public.oopp_sig;
create policy sig_read   on public.oopp_sig for select using (true);
create policy sig_insert on public.oopp_sig for insert with check (true);
create policy sig_update on public.oopp_sig for update using (true) with check (true);
create policy sig_delete on public.oopp_sig for delete using (true);
```

> **Bezpečnost:** klíč `anon` je určený pro klientské aplikace — kdokoli,
> kdo získá adresu projektu **a** anon klíč, uvidí data. Proto klíč nikomu
> neposílejte a nechte ho jen na firemních zařízeních. Pokud unikne, v Supabase
> ho zrušte: *Project Settings → API → JWT Settings → Generate new keys*.
> Pro vyšší bezpečnost můžete politiky omezit na konkrétní `doc_id`.

## 3. Údaje do aplikace

V Supabase: **Project Settings → API**

| v aplikaci (Data → Cloud) | odkud |
|---|---|
| Adresa (URL) | *Project URL*, např. `https://abcdefgh.supabase.co` |
| Klíč / token | klíč **anon public** |
| ID dokumentu | nechte `main` (na všech zařízeních stejné) |

Potom zaškrtněte **Synchronizovat automaticky** a klikněte **⟳ Synchronizovat**.

- První zařízení: data se nahrají do cloudu.
- Další zařízení: při první synchronizaci se data **sloučí** (nemusíte nic vybírat).

## 4. Jak to funguje

- **Data** — jeden dokument v tabulce `oopp`: zaměstnanci, předměty,
  funkce/pozice, výdeje a seznam smazaných záznamů (aby se smazaný záznam
  z jiného zařízení nevrátil).
- **Podpisy** — tabulka `oopp_sig`: posílají se jen nové, stahují se jen
  chybějící. Knížku s podpisy tak vytisknete z tabletu i z počítače.
- **Slučování** — u stejného záznamu vyhraje novější úprava (`updatedAt`).
- **Offline** — bez internetu se pracuje normálně, změny se odešlou, až
  připojení naskočí (synchronizace při startu, po každé změně, po návratu
  do aplikace a každých 5 minut).
- **Když podpis na zařízení chybí**, v tabulce výdejů je tlačítko
  „⬇ stáhnout podpis“ (stahuje se i automaticky po otevření zaměstnance).

## 5. Časté chyby

| hláška | co udělat |
|---|---|
| `HTTP 401` | špatný klíč — zkopírujte znovu `anon public` |
| `HTTP 404` / `relation "oopp" does not exist` | nespustil se SQL z bodu 2 |
| `podpisy se nepodařilo synchronizovat: HTTP 404` | chybí tabulka `oopp_sig` — spusťte bod 2 znovu |
| `new row violates row-level security` | chybí `create policy` — spusťte bod 2 znovu |
| `Cloud není dostupný` | tablet/PC nemá internet, nebo je adresa projektu špatně |

## 6. Jiní poskytovatelé

Aplikace umí i **JSONBin.io** (nejrychlejší nastavení, ale podpisy se vezou
uvnitř dokumentu — větší přenosy) a **vlastní adresu** (firemní server,
Google Apps Script), která musí umět `GET` (vrátí uložený JSON) a `PUT`
(uloží JSON), povolit CORS a případný token přijímat jako
`Authorization: Bearer`.
