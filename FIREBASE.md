# Firebase + GitHub — nastavení cloudu a hostingu

Aplikace OOPP umí mít společnou databázi v cloudu **Firebase** a běžet
z **GitHub Pages**. Tablet v dílně i počítač v kanceláři pak vidí **stejné
zaměstnance, předměty, funkce/pozice, výdeje i obrázky podpisů** a knížku
s podpisy vytisknete z obou zařízení. Data jsou **soukromá** — přístup jen
po přihlášení emailem + heslem.

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
     (další účty už přidává správce přímo v aplikaci — Data → 👤 Uživatelé
     a přístup → ＋ Přidat uživatele; uživatel si heslo zvolí sám z e-mailu,
     viz **UZIVATELE.md**).

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

    // profily uživatelů: ID dokumentu = e-mail malými písmeny
    match /oopp_users/{email} {
      allow read: if signedIn();                              // jména a iniciály vidí přihlášení
      allow create: if signedIn() && (isAdmin() || email == myEmail()); // správce přidá kohokoli, nováček sám sebe
      // Správce smí vše. Uživatel si smí upravit jen SVOJE jméno, iniciály
      // a telefon (formulář z pozvánky) — práva ani aktivaci změnit nemůže.
      allow update: if isAdmin()
        || (signedIn() && email == myEmail()
            && request.resource.data.role == resource.data.role
            && request.resource.data.active == resource.data.active);
      allow delete: if isAdmin();
    }

    // společná data evidence a obrázky podpisů — jen pozvaný uživatel s profilem
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
| `oopp_users` | každý přihlášený (potřebuje jména do kolonky „Vydal“) | správce; nováček si při prvním přihlášení smí založit vlastní profil a každý si smí upravit jen svoje jméno, iniciály a telefon |
| `oopp` (data evidence) | jen uživatel, který má profil v `oopp_users` | totéž |
| `oopp_sig` (podpisy) | jen uživatel s profilem | totéž |

Z toho plyne: **kdo není v aplikaci přidaný, data nepřečte ani při platném
hesle.** Přístup se odebírá smazáním profilu (Data → 👤 Uživatelé a přístup →
🚫 Odebrat). Podrobný návod k účtům je v souboru **UZIVATELE.md**.

> **Starší jednoduché pravidlo.** Kdybyste si práva rozbili, vraťte se k
> `allow read, write: if request.auth != null;` — aplikace pak funguje jako
> dřív (každý přihlášený účet vidí všechno), jen bez rozlišení správce/uživatel.

> První profil správce: přihlaste se e-mailem a heslem, v záložce Data otevřete
> kartu „☁ Cloud“ nebo „👤 Uživatelé“ a klikněte na **✚ Založit profil správce**.
> Tlačítko se ukáže jen tehdy, když v cloudu ještě žádný profil není.

## 2.1 Pozvánka e-mailem — formulář `pozvanka.html`

Když správce přidá uživatele (Data → 👤 Uživatelé a přístup), odejde mu e-mail
s odkazem, kde si **sám zvolí heslo** a doplní, co správce nevyplnil (jméno,
telefon). Heslo nikdy nevidí správce ani aplikace.

Ve výchozím stavu vede odkaz na stránku Firebase (jen pole pro heslo).
Aby se otevřel **náš formulář** (`pozvanka.html` — jméno, telefon, heslo,
česky, s logem), nastavte to jednou v konzoli:

1. <https://console.firebase.google.com> → projekt → **Security → Authentication**
   → karta **Templates**.
2. U typu **Password reset** (česky „Obnovení hesla“) klikněte na **✏ tužku**.
3. Klikněte na **customize action URL** a vložte adresu:
   `https://fezyx.github.io/Swiss-formOOPP/pozvanka.html`
4. Uložit. Od té chvíle používají **všechny** e-maily Firebase (pozvánka
   i „Nové heslo“) tento odkaz.

Co formulář dělá: ověří `oobCode` z odkazu, nechá uživatele zadat heslo,
přihlásí ho a do jeho profilu v `oopp_users` zapíše jméno, iniciály, telefon
a `profileCompletedAt` (práva `role`/`active` zůstávají, jak je nastavil
správce). Odkaz platí **1 hodinu** a jen jednou; po vypršení stačí v aplikaci
kliknout „✉ Nové heslo“.

> Když adresu v konzoli nenastavíte, nic se nerozbije — uživatel jen uvidí
> stránku Firebase (bez loga a bez polí pro jméno/telefon). Profil má
> v takovém případě už vyplněný správce.

## 3. Údaje do aplikace

> **Projekt `swissformoopp` je v aplikaci už přednastavený.** `Project ID`
> i `Web API klíč` jsou přímo v `index.html` (konstanta `CLOUD_PRESET`), takže
> na novém zařízení je **nemusíte vypisovat** — zadáte jen **email a heslo**.
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
| Přihlašovací email | email uživatele z bodu 1 |
| Heslo | heslo uživatele z bodu 1 |
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
| `Přihlášení se nezdařilo (auth/invalid-credential)` | špatný email/heslo, nebo Email/Password metoda není zapnutá |
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
   (Firebase, Project ID, Web API klíč, email, heslo) a zaškrtněte
   **Synchronizovat automaticky**.
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
