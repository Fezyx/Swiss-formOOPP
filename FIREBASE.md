# Firebase + GitHub — nastavení cloudu a hostingu

Aplikace OOPP umí mít společnou databázi v cloudu **Firebase** a běžet
z **GitHub Pages**. Tablet v dílně i počítač v kanceláři pak vidí **stejné
zaměstnance, předměty, funkce/pozice, výdeje i obrázky podpisů** a knížku
s podpisy vytisknete z obou zařízení. Data jsou **soukromá** — přístup jen
po přihlášení přihlašovacím jménem (nickem) a heslem, který zakládá správce
přímo v aplikaci (bez e-mailů).

Každé zařízení má navíc lokální kopii, takže se pracuje i bez internetu
(změny se doplní po připojení).

> **Cena:** stačí plán **Spark (zdarma)** — Firestore v něm dá 1 GiB dat,
> 10 GiB přenosu měsíčně a 50 000 čtení / 20 000 zápisů denně. Platbu
> (Blaze) zapínat nemusíte. Volný tarif Supabase je menší (500 MB databáze)
> a projekt se po týdnu nečinnosti uspí, proto je Firebase výchozí volba.

## 1. Založení projektu Firebase

> **Nové rozhraní Firebase (2025+)** má jiné menu než staré návody. Vlevo nahoře
> je **Search for products** — tudy najdete všechno. Cesty níže platí pro nové
> rozhraní (ve starším se používalo „Build → …").

1. <https://console.firebase.google.com> → **Add project** (název např. `oopp-evidence`).

2. **Přihlašování (Authentication)** — vlevo **Security → Authentication**,
   nebo napište do vyhledávání `Authentication`:
   - **Get started** → karta **Sign-in method** → **Email/Password** → **Enable** → **Save**.
   - karta **Users** → **Add user** → e-mail a heslo **prvního správce**
     (tomuto účtu se v aplikaci přihlásíte e-mailem; další lidi už přidává
     správce přímo v aplikaci — Data → 👤 Uživatelé a přístup → ＋ Přidat
     uživatele; dotyčný si heslo zvolí sám při prvním přihlášení, viz
     **UZIVATELE.md**).

3. **Databáze (Firestore)** — vlevo **Databases & Storage → Firestore**
   (nebo vyhledat `Firestore`):
   - **Create database** → **Production mode** → umístění **europe-west3**
     (Frankfurt) → **Create**. Pravidla viz bod 2.

4. **Klíče pro aplikaci** — na **Project Overview** klikněte **+ Add app**
   a vyberte **Web** (ikona `</>`):
   - název např. `OOPP` → **Register app** (Hosting zapínat nemusíte),
   - Firebase ukáže `firebaseConfig` — opište `projectId` a `apiKey`.
   - Stejné hodnoty jsou i v **⚙ Settings → Project settings → General**.

Rychlý tahák (nové vs. staré menu):

| co potřebujete | nové rozhraní (2025+) | starší návody |
|---|---|---|
| přihlašování | **Security → Authentication** | Build → Authentication |
| databáze | **Databases & Storage → Firestore** | Build → Firestore Database |
| Project ID a Web API klíč | **+ Add app → Web**, nebo **⚙ Settings → Project settings → General** | Project settings → General |

## 2. Pravidla (Security Rules)

V **Firestore → Rules** (v novém rozhraní *Databases & Storage → Firestore → Rules*)
vložte:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn()  { return request.auth != null && request.auth.token.email != null; }
    function myEmail()   { return signedIn() ? request.auth.token.email.lower() : ''; }
    function myPath()    { return /databases/$(database)/documents/oopp_users/$(myEmail()); }
    function isAdmin()   { return signedIn() && exists(myPath()) && get(myPath()).data.role == 'admin'; }
    function hasProfile(){ return signedIn() && exists(myPath()); }

    // přihlašovací jména (nicky): veřejně čitelná (aplikace z nich PŘED
    // přihlášením zjistí číslo verze a práva), zapisuje jen správce
    match /oopp_logins/{nick} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    // profily uživatelů: ID dokumentu = vnitřní adresa nicku (novak@oopp.local)
    match /oopp_users/{email} {
      allow read: if signedIn();                              // jména a iniciály vidí přihlášení
      // Správce založí profil komukoli (i s role: admin). Nováček si smí
      // založit jen SVŮJ profil a JEN jako uživatel — správcem se tak nikdo
      // nemůže udělat sám (dřív tu bylo jen `email == myEmail()` a role
      // v novém dokumentu nebyla nijak omezená).
      allow create: if isAdmin()
        || (signedIn() && email == myEmail()
            && request.resource.data.role == 'user'
            && request.resource.data.active == true);
      // Správce smí vše. Uživatel si smí upravit jen SVOJE jméno, iniciály
      // a telefon (tlačítko „✍ Změnit“ / první přihlášení) — práva ani
      // aktivaci změnit nemůže.
      allow update: if isAdmin()
        || (signedIn() && email == myEmail()
            && request.resource.data.role == resource.data.role
            && request.resource.data.active == resource.data.active);
      allow delete: if isAdmin();
    }

    // společná data evidence a obrázky podpisů — jen uživatel s profilem
    match /oopp/{docId}     { allow read, write: if hasProfile(); }
    match /oopp_sig/{sigId} { allow read, write: if hasProfile(); }

    // nic jiného v databázi
    match /{document=**} { allow read, write: if false; }
  }
}
```

Co pravidla znamenají:

| kolekce | kdo smí číst | kdo smí zapisovat |
|---|---|---|
| `oopp_logins` (přihlašovací jména) | **kdokoli** (i nepřihlášený — podle nicku se pozná účet a jeho verze; nejsou tam žádná data) | jen správce |
| `oopp_users` | každý přihlášený (potřebuje jména do kolonky „Vydal“) | správce (i s `role: admin`); nováček si smí založit jen **vlastní** profil a jen s `role: user`; každý si smí upravit jen svoje jméno, iniciály a telefon |
| `oopp` (data evidence) | jen uživatel, který má profil v `oopp_users` | totéž |
| `oopp_sig` (podpisy) | jen uživatel s profilem | totéž |

Z toho plyne: **kdo není v aplikaci přidaný, data nepřečte ani při platném
hesle.** Přístup se odebírá tlačítkem 🚫 Odebrat (Data → 👤 Uživatelé
a přístup); tím se profil smaže a nick v `oopp_logins` dostane `active: false`.
Podrobný návod k účtům je v souboru **UZIVATELE.md**.

> **Starší jednoduché pravidlo.** Kdybyste si práva rozbili, vraťte se k
> `allow read, write: if request.auth != null;` — aplikace pak funguje jako
> dřív (každý přihlášený účet vidí všechno), jen bez rozlišení správce/uživatel.

> **První profil správce (nový projekt) — jen v konzoli Firebase.** Pravidla
> od v72 nedovolí, aby si kdokoli založil profil s `role: admin` sám (jinak by
> si každý účet mohl dát práva). Postup: Firestore → `oopp_users` →
> **Add document** → *Document ID* = přesně přihlašovací adresa účtu (malými
> písmeny, např. `lukas.dvorak@swissform.cz`) → pole `role` = `admin`,
> `active` = `true` (boolean), `name` = „Jméno Příjmení“, `initials` = „J.P.“,
> `email` = stejná adresa → **Save**. Pak se v aplikaci přihlaste — v hlavičce
> musí být „· správce“. Další účty už přidáváte v aplikaci (nickem) a práva
> správce dáváte tlačítkem **⭐ Udělat správcem**.

## 2.1 Přihlašovací jména (nicky) — bez e-mailů

Lidé se v aplikaci nehlásí e-mailem, ale **přihlašovacím jménem (nickem)**,
které jim správce založí přímo v aplikaci (Data → 👤 Uživatelé a přístup →
＋ Přidat uživatele, třeba `novak`). Žádná pošta se neodesílá, takže nemůže
selhat doručení ani denní limit e-mailů.

Jak to funguje:

1. Správce založí nick → ve Firestore vznikne dokument `oopp_logins/novak`
   (nick, práva, číslo verze) a prázdný profil v `oopp_users`.
2. Dotyčný klikne v kartě „🔒 Přihlášení k datům“ na **🆕 První přihlášení —
   vytvořit heslo**, napíše nick, vybere se v seznamu zaměstnanců a zvolí si
   heslo (aspoň 6 znaků). Tím vznikne jeho účet ve Firebase a rovnou se
   přihlásí — iniciály do kolonky „Vydal“ se berou z vybraného zaměstnance.
3. Heslo zná jen on; správce ho nikdy nevidí ani nemůže zjistit. V seznamu
   uživatelů je proto jen stav **heslo nastaveno / nenastaveno**.

**Firebase umí přihlášení jen e-mailem**, proto má každý nick svůj vnitřní
e-mail, který uživatel nikdy nevidí: `novak@oopp.local`. Po smazání hesla se
k nicku přidá číslo verze (`novak.v2@oopp.local`), takže starý účet přestane
platit. Do polí v aplikaci se pořád píše jen nick (správce s vlastním účtem
z konzole může napsat i e-mail — pozná se podle `@`).

> **Kolekce `oopp_logins` musí být veřejně čitelná** — aplikace z ní ještě
> PŘED přihlášením zjistí číslo verze a práva nicku. Zapisovat do ní smí jen
> správce. Pravidla jsou v kapitole 2; bez nich se nick nepřihlásí
> (`permission-denied`).

### Smazání hesla (zapomenuté heslo)

1. Data → 👤 Uživatelé a přístup → u jména **🔑 Smazat heslo**.
2. Aplikace zvedne číslo verze v `oopp_logins` a založí nový profil — staré
   heslo přestane platit všude (i na tabletu, kde zůstalo uložené).
3. Dotyčný se přihlásí stejným nickem tlačítkem **🆕 První přihlášení** a
   zvolí si nové heslo. Jméno i práva zůstávají.

### Když se nick nepřihlásí

| co aplikace napíše | co udělat |
|---|---|
| „Přihlašovací jméno … není zaregistrované“ | nick v `oopp_logins` není — správce ho musí přidat, nebo je překlep (nick se píše malými písmeny bez diakritiky) |
| „Heslo už je nastavené“ | dotyčný už heslo má — ať se jím přihlásí; když ho nezná, správce ho smaže (🔑) |
| „Tomuto přihlašovacímu jménu správce odebral přístup“ | nick má `active: false` (🚫 Odebrat) — správce ho znovu přidá stejným nickem |
| `permission-denied` (už při přihlášení) | chybí veřejné čtení kolekce `oopp_logins` v pravidlech — kapitola 2 |
| `auth/email-already-in-use` | stejný nick i číslo verze už ve Firebase existuje — správce smaže heslo (tím se verze zvedne) |
| `auth/invalid-credential` | špatné heslo, nebo účet vznikl dřív pod jinou verzí — správce smaže heslo |
| `auth/network-request-failed` | zařízení nemá internet, nebo síť blokuje `*.googleapis.com` |

> Účty jsou vidět v konzoli: **Security → Authentication → Users**. Mají
> adresy typu `novak@oopp.local` — to je jen vnitřní podoba nicku, žádná
> pošta na ni nechodí. Nemažte je ručně; heslo se „maže“ tlačítkem
> v aplikaci (🔑 Smazat heslo), aby se správně zvedla verze.

### Dokument v `oopp_users` musí mít ID přesně jako přihlašovací adresa

Pravidlo `isAdmin()` hledá dokument `oopp_users/<e-mail z přihlášení>`, takže
**rozhoduje ID dokumentu, ne pole `email` uvnitř něj**. Když dokument založíte
ručně v konzoli pod jiným ID (např. ID `lukas.dvorak@swissform.cz`, ale uvnitř
`email: lukas.dvorak@gmail.com`), účet se přihlásí, ale práva správce mít
nebude — a nepůjde mu ani přidávat uživatele (`permission-denied`).

Rychlá kontrola bez konzole: v aplikaci (přihlašovací karta nebo
Data → 👤 Uživatelé a přístup) klikněte **🔍 Zkontrolovat profil** — vypíše
adresu z Firebase, existenci profilu, jeho roli, duplikát pod jiným ID a
seznam **všech správců** v cloudu (tak poznáte, když někdo přibyl). Když profil
na vaší adrese chybí, tlačítko **🛠 Založit mi profil** ho založí přesně pod ní
— ale vždy jen s `role: user`, protože pravidla `create` dovolí nováčkovi
založit si vlastní profil jen jako uživatel. Práva správce pak přidá stávající
správce (⭐ Udělat správcem), nebo je nastavte v konzoli.

Alternativa v konzoli: zkopírujte dokument pod správné ID (malými písmeny)
a v něm nechte `role: admin`, `active: true`, `name`, `initials`; starý
dokument pod špatným ID smažte. Stejně nastavte `oopp_logins/<nick>` →
`role: admin` (jinak práva neplatí při přihlášení nickem).

## 3. Údaje do aplikace

> **Projekt `swissformoopp` je v aplikaci už přednastavený.** `Project ID`
> i `Web API klíč` jsou přímo v `index.html` (konstanta `CLOUD_PRESET`), takže
> na novém zařízení je **nemusíte vypisovat** — zadáte jen **přihlašovací
> jméno a heslo**.
> Webový `apiKey` u Firebase není tajemství (je vidět v každé webové aplikaci
> na Firebase) — data chrání přihlášení a pravidla ve Firestore.
> **Heslo se do stránky nikdy nedává** (repo je veřejné) — zadává se ručně
> jednou na každém zařízení a zůstane v něm uložené.

V **⚙ Settings → Project settings → General** najdete **Project ID** a **Web API Key**
(stejné hodnoty, jaké ukáže **+ Add app → Web** v `firebaseConfig` jako `projectId` a `apiKey`).
V aplikaci (Data → ☁ Cloud) stačí:

| pole | hodnota |
|---|---|
| Poskytovatel | Firebase (přednastaveno) |
| ID projektu | `swissformoopp` (přednastaveno) |
| Web API klíč | `AIza…` (přednastaveno) |
| Přihlašovací jméno (nick) | nick od správce (nebo e-mail účtu z bodu 1 — první správce) |
| Heslo | heslo, které si dotyčný zvolil při prvním přihlášení |
| ID dokumentu | `main` (přednastaveno) |

Klikněte **🔑 Přihlásit** → **🧪 Otestovat připojení** → **⟳ Synchronizovat**.
Po přihlášení se synchronizace spustí sama („Synchronizovat automaticky“ je
zapnuté ve výchozím stavu). První zařízení data nahraje, druhé je při první
synchronizaci **sloučí** — a stejně tak každá další synchronizace: data ze
všech zařízení se jen **přidávají**, nikdy nepřepisují (viz bod 6). Tlačítko
**🧪 Otestovat připojení** ověří přihlášení i databázi a napíše, kolik záznamů
je v cloudu — hodí se při prvním nastavení a při ladění chyb.

> Heslo se ukládá v zařízení (aby se tablet znovu přihlašoval sám).
> Držte údaje jen na firemních zařízeních.
>
> Změna projektu (jiný `Project ID` / `apiKey`) = upravte `CLOUD_PRESET`
> v `index.html`; ručně vyplněné hodnoty v aplikaci mají vždy přednost.


## 4. GitHub Pages (hosting aplikace)

Aplikace může běžet z veřejné adresy — aktualizace = `git push`.

1. Vytvořte soukromý/veřejný repozitář na GitHubu (např. `oopp`).
2. Nakopírujte do něj tyto soubory: `index.html`, `manifest.webmanifest`,
   `sw.js`, `CLOUD.md`, `FIREBASE.md`, `UZIVATELE.md`, `NAVOD.txt`, `.nojekyll` a složku
   `dependencies/`.
   **Ne** `OOPP_data.json`, `OOPP.exe`, `*.dll` (soubor `.gitignore` už je vylučuje).
3. Repo → **Settings → Pages → Source: Deploy from a branch → Branch: main, / (root)** → Save.
4. Za ~1 minutu je aplikace na `https://<uživatel>.github.io/<repo>/`.
   Tam ji otevřete a nainstalujete jako PWA (v prohlížeči „Instalovat aplikaci“).

## 5. Časté chyby

| hláška | co udělat |
|---|---|
| `Přihlášení se nezdařilo (auth/invalid-credential)` | špatné heslo, neexistující nick, nebo Email/Password metoda není zapnutá |
| `auth/configuration-not-found` | špatné Project ID / Web API klíč |
| `auth/network-request-failed` | zařízení nemá internet, nebo síť blokuje `*.googleapis.com` (firemní Wi-Fi, VPN) |
| `Firebase SDK se nenačetlo` | soubor `dependencies/firebase/*.js` chybí vedle `index.html` (nebo se nepodařilo načíst stránku) |
| `Missing or insufficient permissions` | v Rules není `request.auth != null`, nebo nejste přihlášení |

> **Firebase SDK je součástí aplikace** (složka `dependencies/firebase/`) —
> netahá se z internetu. Na mobilu tedy cloud neblokuje AdBlock, VPN ani filtr
> DNS a SDK funguje i offline. Při kopírování aplikace na jiné PC/disk proto
> nezapomeňte na celou složku `dependencies`.

## 6. Počítač + mobil — stejná data, aplikace na plochu

Aplikace je jedna webová stránka, takže počítač i mobil otevírají **stejnou
adresu** a pracují s **jednou databází**: co se uloží na tabletu, je do pár
sekund i na PC (a naopak).

1. Na obou zařízeních otevřete stejnou adresu (např.
   `https://<uživatel>.github.io/<repo>/`).
2. Na obou zařízeních vyplňte v *Data → ☁ Cloud* **stejné údaje**
   (Firebase, Project ID, Web API klíč, přihlašovací jméno, heslo) a nechte
   **automatickou synchronizaci** (je zapnutá vždy).
3. Na prvním zařízení klikněte **⬆ Nahrát do cloudu**, na druhém
   **⟳ Synchronizovat** — data se **sloučí** (u stejného záznamu vyhraje
   novější, nic se nepřepíše ani nesmaže).

### Souběh více zařízení — data se jen přidávají

Synchronizace je od verze **v27** udělaná tak, že **každý zápis do cloudu je
nejdřív sloučení**:

1. aplikace si přečte, co je v cloudu (co tam mezitím dali ostatní),
2. sloučí to s místními daty podle `id` záznamu — chybějící záznamy **přidá**,
   u stejného `id` vyhraje novější `updatedAt`,
3. sjednocení uloží do cloudu i do zařízení,
4. hned znovu přečte cloud; kdyby v tu chvíli psalo jiné zařízení, jeho
   záznamy znovu sloučí a odešle (max. 3 kola, zbytek dohoní příští sync).

Takže: dva výdeje pro stejného zaměstnance vzniklé na tabletu a na PC
v jednu chvíli **zůstanou oba**. Nic se „nepřepíše“ ani „nepřejede“ druhým
zařízením. Mazání se pamatuje v `tombstones`, aby smazaný záznam z jiného
zařízení znovu nevznikl.

Automatická synchronizace běží po každé změně, při startu, po návratu do
aplikace a každé 2 minuty; je zapnutá ve výchozím stavu.

### Když se zařízení neshodují

* **🧪 Otestovat připojení** (Data → ☁ Cloud) — napíše, zda je přihlášení
  a databáze v pořádku, a kolik záznamů je v cloudu.
* Na obou zařízeních musí být **stejné Project ID** a **stejný uživatel**.
* Konfliktní dialog už není potřeba — **každá synchronizace data sloučí**.
  Když se zařízení přesto neshodují, klikněte na obou zařízeních
  **⟳ Synchronizovat**.

### Instalace na plochu (bez obchodu Play / App Store)

| zařízení | postup |
|---|---|
| **Android (Chrome / Edge)** | otevřít adresu → ⋮ → **Přidat na plochu / Instalovat aplikaci** (v aplikaci je i tlačítko **⬇ Nainstalovat aplikaci**) |
| **iPhone / iPad (Safari)** | otevřít adresu → **Sdílet ⤴** → **Přidat na plochu** |
| **Windows / Mac (Chrome, Edge)** | ikona **Instalovat** v adresním řádku, nebo ⋮ → Aplikace → Instalovat tuto stránku |
| **Windows – OOPP.exe** | spouští stejnou stránku lokálně, cloud funguje také |

Po instalaci se aplikace otevírá z plochy jako běžná aplikace (bez adresního
řádku) a funguje i offline.

### Když se zařízení neshodují

* **🧪 Otestovat připojení** (Data → ☁ Cloud) — napíše, zda je přihlášení
  a databáze v pořádku, a kolik záznamů je v cloudu.
* Na obou zařízeních musí být **stejné Project ID** a **stejný uživatel**.
* Když se seznamy přesto rozcházejí, klikněte na obou zařízeních
  **⟳ Synchronizovat** — každá synchronizace data jen slučuje, takže se nic
  nemůže ztratit.

### Mobil zobrazuje starou verzi aplikace

Nainstalovaná aplikace (PWA) si drží stránku v offline paměti zařízení. Proto
má **vlastní kontrolu verze**: při každém spuštění (a pak každých 30 minut)
porovná `APP_VERSION` v běžící stránce s verzí na serveru (`CACHE` v `sw.js`).
Když je na serveru novější verze, aplikace sama smaže offline paměť,
odregistruje service worker a znovu se načte — **odinstalace není potřeba**.

1. Verzi zkontrolujete v **Data → Instalace do telefonu / tabletu** na řádku
   **„Verze aplikace: vXX · offline paměť: oopp-app-vXX“**.
2. Když aktualizace nedoběhne (např. telefon byl celou dobu offline), klepněte
   na **⟳ Aktualizovat aplikaci** — to samé udělá ručně.
3. Když tlačítko v zařízení vůbec není (běží opravdu hodně stará verze,
   např. před zavedením kontroly verze), otevřete adresu aplikace
   **v prohlížeči** (ne přes ikonu na ploše) a ikonu na ploše přidejte znovu.
   V Chrome/Edge pomůže i **Nastavení stránky → Vymazat data** (smaže ale
   i data uložená v zařízení — nejdřív *Data → Záloha*).

> Pozn.: první přechod na verzi s automatickou aktualizací musí každé zařízení
> udělat ručně (jednorázově) — stará verze o nové ještě neví.

## 7. Alternativy (bez Firebase)

Aplikace umí i **Supabase** (viz `CLOUD.md`), **JSONBin.io** a **vlastní
adresu** (firemní server / Google Apps Script) — přepnete v poli Poskytovatel.
