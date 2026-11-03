# Firebase + GitHub — nastavení cloudu a hostingu

Aplikace OOPP umí mít společnou databázi v cloudu **Firebase** a běžet
z **GitHub Pages**. Tablet v dílně i počítač v kanceláři pak vidí **stejné
zaměstnance, předměty, funkce/pozice, výdeje i obrázky podpisů** a knížku
s podpisy vytisknete z obou zařízení. Data jsou **soukromá** — přístup jen
po přihlášení emailem + heslem.

Každé zařízení má navíc lokální kopii, takže se pracuje i bez internetu
(změny se doplní po připojení).

## 1. Založení projektu Firebase

1. <https://console.firebase.google.com> → **Add project** (název např. `oopp-evidence`).
2. V projektu zapněte:
   - **Build → Authentication → Get started → Sign-in method → Email/Password → Enable** (a uložit).
   - **Build → Authentication → Users → Add user** → zadejte firemní email + heslo
     (jeden sdílený účet pro tablet i PC).
   - **Build → Firestore Database → Create database** → produkční mód, region
     `europe-west3` (Frankfurt).

## 2. Pravidla (Security Rules)

V **Firestore Database → Rules** vložte:

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

V **Project Settings → General** najděte **Web API Key** a **Project ID**.
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

## 6. Alternativy (bez Firebase)

Aplikace umí i **Supabase** (viz `CLOUD.md`), **JSONBin.io** a **vlastní
adresu** (firemní server / Google Apps Script) — přepnete v poli Poskytovatel.
