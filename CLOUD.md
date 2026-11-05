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

Potom klikněte **⟳ Synchronizovat**. Zaškrtávat nic nemusíte — synchronizace
je zapnutá vždy (po každé změně, při startu, po návratu do aplikace a každé
2 minuty).

- První zařízení: data se nahrají do cloudu.
- Další zařízení: při první synchronizaci se data **sloučí** (nemusíte nic vybírat).

## 4. Jak to funguje

- **Data** — jeden dokument v tabulce `oopp`: zaměstnanci, předměty,
  funkce/pozice, výdeje a seznam smazaných záznamů (aby se smazaný záznam
  z jiného zařízení nevrátil).
- **Podpisy** — tabulka `oopp_sig`: obrázek podpisu je uložený **jen
  v cloudu**. V zařízení zůstává pouze fajfka „✔ podepsáno“, takže se každý
  telefon/tablet/PC neplní podpisy ze všech ostatních zařízení.
  - Po podepsání se podpis při nejbližší synchronizaci nahraje do cloudu a
    z dat zařízení se uvolní (místo něj zůstane jen příznak „podepsáno“).
  - Podpis se z cloudu stáhne **až ve chvíli, kdy je potřeba** — při
    zobrazení náhledu, při tisku knížky a při exportu do PDF. Do paměti, ne
    do dat zařízení; po vytištění (nebo po zavření náhledu) se zase zahodí.
  - Knížku s podpisy tak vytisknete z kteréhokoli zařízení — musí ale mít
    internet. Bez připojení se v knížce místo podpisu vytiskne poznámka
    „podpis v cloudu“ a aplikace upozorní, kolik podpisů se nepodařilo
    načíst.
  - Ruční úklid: Data → „☁ Cloud“ → „🧹 Uvolnit podpisy z tohoto zařízení“
    nahraje čekající podpisy do cloudu a z tohoto zařízení je smaže.
  - Do stejné tabulky `oopp_sig` se ukládají i **fotky předávacích protokolů**
    (nepovinné, nejvýš dvě) — pod klíči `p_{id}_photo1` a `p_{id}_photo2`.
    Fungují stejně jako podpisy: po nahrání do cloudu se z dat zařízení uvolní
    (zůstane jen značka „📷 2“) a při náhledu/tištění protokolu se stáhnou
    do paměti. Tabulku proto není potřeba nijak rozšiřovat.
- **Slučování** — u stejného záznamu vyhraje novější úprava (`updatedAt`).
- **Bez vyskakovacích hlášek** — automatická synchronizace data jen tiše sloučí
  (žádná hláška „načtena data z jiného zařízení“). Výsledek je vidět v kartě
  Cloud a malým indikátorem v hlavičce.
- **Karta Cloud je rozklikávací** (jako všechny karty v záložce Data) a stav
  poslední synchronizace je vidět i v její hlavičce — kvůli kontrole ji tedy
  nemusíte otevírat. Výběr složky na SD kartě / USB už v aplikaci není: data
  se ukládají automaticky do zařízení a podpisy se po nahrání do cloudu
  ze zařízení mažou.
- **Číselník předmětů** — výchozí seznam předmětů se zakládá jen tehdy, když je
  cloud úplně prázdný (první zařízení, které data zakládá). Na dalším zařízení
  se předměty vezmou z cloudu, takže se při instalaci na nový tablet/PC
  nepřidá druhá kopie předmětů. Kdyby v datech duplicity zůstaly (starší verze
  zakládaly výchozí předměty s náhodným id), aplikace je při startu a po
  každém sloučení dat sama sloučí: zůstane jeden záznam stejného názvu
  (bez ohledu na diakritiku a velikost písmen), chybějící údaje se z kopií
  doplní, výdeje (`itemId`) i seznamy „může nafasovat“ se přesměrují na
  ponechané id a kopie se zapíše jako smazaná (tombstone), aby se z cloudu
  ani z jiného zařízení nevrátila.
- **Offline** — bez internetu se pracuje normálně, změny se odešlou, až
  připojení naskočí (synchronizace při startu, po každé změně, po návratu
  do aplikace a každé 2 minuty).
- **Ticho při synchronizaci** — aplikace už nevyskakuje s dlouhými hláškami.
  V hlavičce je malé kolečko: točí se při synchronizaci, po dokončení na
  chvíli zezelená „✔“ a při chybě zčervená „!“.
- **Když podpis na zařízení chybí**, v tabulce výdejů je u výdeje zelené
  tlačítko „✔ podepsáno“ — klepnutím se podpis stáhne z cloudu a zvětší
  (po zavření náhledu se z paměti zase uvolní). Obrázek se v seznamu
  výdejů ukazuje jen u podpisu, který vznikl na tomto zařízení a ještě není
  v cloudu; stažené podpisy (náhled, tisk, PDF) se do seznamu nekreslí.
  Kdyby je tam starší verze aplikace nechala, při startu a po každém
  sloučení dat se uklidí — obrázek zůstává v cloudu.

## 5. Časté chyby

| hláška | co udělat |
|---|---|
| `HTTP 401` | špatný klíč — zkopírujte znovu `anon public` |
| `HTTP 404` / `relation "oopp" does not exist` | nespustil se SQL z bodu 2 |
| `podpisy se nepodařilo nahrát: HTTP 404` | chybí tabulka `oopp_sig` — spusťte bod 2 znovu |
| `new row violates row-level security` | chybí `create policy` — spusťte bod 2 znovu |
| `Cloud není dostupný` | tablet/PC nemá internet, nebo je adresa projektu špatně |

## 6. Jiní poskytovatelé

Aplikace umí i **JSONBin.io** (nejrychlejší nastavení, ale podpisy se vezou
uvnitř dokumentu — větší přenosy) a **vlastní adresu** (firemní server,
Google Apps Script), která musí umět `GET` (vrátí uložený JSON) a `PUT`
(uloží JSON), povolit CORS a případný token přijímat jako
`Authorization: Bearer`.
