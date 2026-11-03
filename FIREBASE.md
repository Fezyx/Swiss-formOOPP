# Firebase + GitHub — nastavení cloudu a hostingu

Aplikace OOPP umí mít společnou databázi v cloudu **Firebase** a běžet
z **GitHub Pages**. Tablet v dílně i počítač v kanceláři pak vidí **stejné
zaměstnance, předměty, funkce/pozice, výdeje i obrázky podpisů** a knížku
s podpisy vytisknete z obou zařízení. Data jsou **soukromá** — přístup jen
po přihlášení emailem + heslem.

Každé zařízení má navíc lokální kopii, takže se pracuje i bez internetu
(změny se doplní po připojení).

## 1. Založení projektu Firebase

> **Nové rozhraní Firebase (2025+)** má jiné menu než staré návody. Vlevo nahoře
> je **Search for products** — tudy najdete všechno. Cesty níže platí pro nové
> rozhraní (ve starším se používalo „Build → …").

1. <https://console.firebase.google.com> → **Add project** (název např. `oopp-evidence`).

2. **Přihlašování (Authentication)** — vlevo **Security → Authentication**,
   nebo napište do vyhledávání `Authentication`:
   - **Get started** → karta **Sign-in method** → **Email/Password** → **Enable** → **Save**.
   - karta **Users** → **Add user** → firemní email + heslo
     (jeden sdílený účet pro tablet i PC).

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
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Toto pravidlo = **jen přihlášený uživatel** (Firebase Auth) smí data číst a psát.

## 3. Údaje do aplikace

V **⚙ Settings → Project settings → General** najděte **Project ID** a **Web API Key**
(stejné hodnoty, jaké ukáže **+ Add app → Web** v `firebaseConfig` jako `projectId` a `apiKey`).
Do aplikace (Data → ☁ Cloud) zadejte:

| pole | hodnota |
|---|---|
| Poskytovatel | Firebase |
| ID projektu | `Project ID` (např. `oopp-evidence`) |
| Web API klíč | `Web API Key` |
| Přihlašovací email | email uživatele z bodu 1 |
| Heslo | heslo uživatele z bodu 1 |
| ID dokumentu | nechte `main` |

Klikněte **Uložit nastavení** → **🔑 Přihlásit** → **⟳ Synchronizovat**.
První zařízení data nahraje, druhé je při první synchronizaci **sloučí**.
Tlačítko **🧪 Otestovat připojení** ověří přihlášení i databázi a napíše,
kolik záznamů je v cloudu — hodí se při prvním nastavení a při ladění chyb.

> Heslo se ukládá v zařízení (aby se tablet znovu přihlašoval sám).
> Držte údaje jen na firemních zařízeních.

## 4. GitHub Pages (hosting aplikace)

Aplikace může běžet z veřejné adresy — aktualizace = `git push`.

1. Vytvořte soukromý/veřejný repozitář na GitHubu (např. `oopp`).
2. Nakopírujte do něj tyto soubory: `index.html`, `manifest.webmanifest`,
   `sw.js`, `CLOUD.md`, `FIREBASE.md`, `NAVOD.txt`, `.nojekyll` a složku
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
| `Firebase SDK se nenačetlo` | není internet — obnovte stránku po připojení |
| `Missing or insufficient permissions` | v Rules není `request.auth != null`, nebo nejste přihlášení |

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
   **⟳ Synchronizovat** — data se sloučí (u stejného záznamu vyhraje novější).

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
* Při hlášce o konfliktu zvolte **Sloučit** — spojí záznamy z obou zařízení,
  u stejného záznamu vyhraje novější.

## 7. Alternativy (bez Firebase)

Aplikace umí i **Supabase** (viz `CLOUD.md`), **JSONBin.io** a **vlastní
adresu** (firemní server / Google Apps Script) — přepnete v poli Poskytovatel.
