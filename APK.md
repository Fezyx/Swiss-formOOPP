EVIDENCE OOPP — instalace jako APK do telefonu / tabletu
=======================================================

Tohle je návod, jak dostat aplikaci do Androidu jako normální instalační
soubor (.apk) s ikonou na ploše. Vše je už připravené — nic se nemusí
programovat ani sestavovat na počítači, APK sestaví GitHub sám.


1) Co APK je a jak funguje
--------------------------
- APK je malý obal (knihovna WebView). Uvnitř se otevírá stejná aplikace
  jako v prohlížeči — z adresy https://fezyx.github.io/Swiss-formOOPP/
- Díky tomu se aplikace v APK aktualizuje SAMA stejně jako web (při spuštění
  si stáhne novou verzi). Nové APK je potřeba jen tehdy, když se mění
  samotný obal (tisk, ukládání souborů) — to se děje výjimečně.
- Offline režim: po prvním načtení s internetem se aplikace uloží do zařízení
  (service worker) a jde otevřít i bez připojení. Data jsou v zařízení
  (localStorage) a v cloudu (Firebase).
- Data v APK zůstávají i po instalaci novější verze APK — neodinstalovává se.


2) Kde APK stáhnout (pořád stejná adresa)
-----------------------------------------
https://github.com/Fezyx/Swiss-formOOPP/releases/latest/download/OOPP.apk

Tuhle adresu lze otevřít přímo v telefonu/tabletu — soubor se stáhne.
Když APK ještě neexistuje (první sestavení), podívejte se:
  GitHub → záložka „Actions“ → „Android APK“ → poslední běh (zelený)
  → dole „Artifacts“ → OOPP-apk-vXX.zip (uvnitř je OOPP.apk).
  Nebo: GitHub → „Releases“ → značka „apk“ → soubor OOPP.apk.

Kdy se sestavuje nové APK:
- automaticky po každé změně ve složce android/ (nativní obal),
- ručně: GitHub → Actions → „Android APK“ → tlačítko „Run workflow“.


2b) QR kód ke stažení (sdílecí kód)
-----------------------------------
Aplikace má v sobě zabudovaný QR kód s odkazem z bodu 2, takže se dá
stahování ukázat kolegovi nebo vytisknout:

- v aplikaci: záložka **Data → karta „Sdílecí kód (QR)“** — QR kód, vypsaný
  odkaz, tlačítka „📋 Kopírovat odkaz“ a „⬇ Otevřít odkaz“,
- v tomto repozitáři: soubor **APK-QR.svg** (vektor, 512 px, pro tisk nebo
  vložení do dokumentu) — otevře se v prohlížeči nebo v Illustratoru/Inkscape.

QR kód se při novém sestavení APK nemění — odkaz míří vždy na nejnovější
vydání (…/releases/latest/download/OOPP.apk).

Jak QR kód přegenerovat (kdyby se změnila adresa):
1. `node tools/qr.js "https://…/OOPP.apk" --js` vypíše řádky
   `QR_SHARE_SIZE` a `QR_SHARE_BITS` → vložte je do index.html
   (hledejte „Sdílecí QR kód“).
2. `node tools/qr.js "https://…/OOPP.apk" --svg APK-QR.svg` přepíše soubor
   pro tisk.
   Nástroj nepotřebuje žádné knihovny ani internet — QR kód počítá sám.
   Potom zvyšte APP_VERSION v index.html a CACHE v sw.js (jako u každé
   změny kódu).


3) Instalace do telefonu / tabletu
----------------------------------
1. V zařízení otevřete odkaz z bodu 2 (Chrome, Edge, cokoli).
2. Stáhne se soubor OOPP.apk (najdete ho ve složce Stahování).
3. Klepněte na něj. Android se zeptá:
   - „Povolit instalaci z tohoto zdroje?“ → Povolit (u Chrome: „Nastavení“
     → „Povolit z tohoto zdroje“).
   - „Aplikace nebyla ověřena v Play Protect“ → „Přesto nainstalovat“.
4. Hotovo: na ploše je ikona „Evidence OOPP“.

Instalace novější verze: stačí stáhnout a klepnout na nové APK — nainstaluje
se přes starou verzi a data zůstanou. Neodinstalovávejte starou verzi předem.


4) První spuštění
-----------------
1. První spuštění potřebuje internet (stáhne se aplikace). Bez internetu se
   zobrazí hláška „Aplikace teď nemá připojení“ s tlačítkem „Zkusit znovu“.
2. Připojení ke cloudu: hned po spuštění je nahoře oranžová lišta
   „☁ Cloud zatím není připojený“ s tlačítkem „🔑 Připojit ke cloudu“.
   Zadejte e-mail a heslo a klepněte na „Přihlásit a sladit data“ — data se
   pak stáhnou ze společného cloudu a dál se slučují sama. Stejné pole je
   i v Záložce Data → karta „☁ Cloud“ (ID projektu a API klíč jsou už
   přednastavené). Přihlášení se dělá jednou na každém zařízení; heslo se do
   aplikace nevkládá, protože web i repozitář jsou veřejné — kdokoli by se
   pak dostal ke jménům, výdejům i podpisům.
3. Ověření: Data → „Instalace do telefonu / tabletu“ → dole je
   „Verze aplikace: vXX · offline paměť: oopp-app-vXX“ — podle toho poznáte,
   jakou verzi zařízení používá.


5) Co APK umí navíc oproti prohlížeči
-------------------------------------
- 🖨 Tisk knížky / potvrzení: otevře se tiskárna Androidu — tiskne se na
  tiskárně nebo „Uložit jako PDF“.
- ⬇ Export PDF, Export CSV, Stáhnout zálohu: soubor se uloží do složky
  Stahování (aplikace napíše „Uloženo: Stahování/název“). Odtud ho lze
  poslat mailem, do WhatsAppu nebo do Excelu.
- 📥 Import zálohy: otevře se výběr souboru v Androidu.
- Tlačítko Zpět: nejdřív zavře otevřený podpis / výběr data / detail
  zaměstnance, a teprve podruhé ukončí aplikaci.
- Na Androidu 7–9 si aplikace při prvním ukládání vyžádá povolení
  „Ukládání“ — po povolení klepněte na export znovu.
- Úložiště: v APK se aplikace na žádnou složku neptá. Data (zaměstnanci,
  předměty, funkce/pozice, výdeje i podpisy) zůstávají v zařízení a do
  společného cloudu se synchronizují samy. Výběr složky na SD kartě / USB je
  jen pro Windows (OOPP.exe) — v APK je vypnutý, protože WebView neumí se
  složkou na kartě spolehlivě pracovat a data by se zbytečně rozdvojila
  (soubor OOPP_data.json vs. cloud). Záložka Data → karta „Úložiště v zařízení“
  to uživateli vypíše; zálohu dělá „⬇ Stáhnout zálohu (JSON)“.


6) Když se sestavení APK nepovede
---------------------------------
1. GitHub → záložka „Actions“ → „Android APK“ → červený běh → krok, který
   spadl (červený křížek) → text chyby.
2. Při chybě workflow sám uloží text sestavení do souboru
   „apk-build-log.txt“ v repozitáři — tam je vidět přesná příčina
   (klidně ho po vyřešení smažte).
3. Nejčastější příčiny: dočasný výpadek GitHubu, změna verze Gradle/Android
   pluginu. Řešení: „Re-run all jobs“, nebo upravit verze v
   android/build.gradle (AGP) a v .github/workflows/android-apk.yml (Gradle).
4. APK z dřívějška funguje dál — aplikace v něm se aktualizuje z webu,
   takže není kam spěchat.


7) Jak je to technicky (pro údržbu)
-----------------------------------
- android/ ....................... nativní obal (Java, WebView)
  - app/src/main/java/cz/swissform/oopp/MainActivity.java
      načtení aplikace, tisk (PrintManager), ukládání exportů (MediaStore
      do složky Stahování), výběr souboru pro import, tlačítko Zpět.
  - app/src/main/assets/offline.html ... hláška, když není internet
  - app/build.gradle ............. verze (dodává CI), podpis, minSdk 24
  - keystore/oopp.jks ............ podpisový klíč (vytvoří a uloží CI při
                                   prvním běhu; heslo je ve workflow)
- .github/workflows/android-apk.yml ... sestavení + vydání APK
  - verze APK se bere z APP_VERSION v index.html (versionName) a z čísla
    běhu (versionCode), takže po zvýšení verze v aplikaci stačí spustit build.
- Propojení s webovou částí (index.html):
  - isAndroidShell() pozná, že běží v APK (objekt window.OOPPAndroid),
  - downloadBlob() při exportu předá soubor nativní části (uloží do Stahování),
  - doPrint() zavolá nativní tisk místo window.print(),
  - window.__ooppBack řeší tlačítko Zpět,
  - refreshInstallUI() v APK nenabízí instalaci z prohlížeče a vypíše verzi.
  - renderShareQr() kreslí v záložce Data sdílecí QR kód (odkaz na APK)
    jako SVG přímo z matice v index.html — funguje i offline.
- QR kód ke stažení:
  - APK-QR.svg .................... QR kód s odkazem na APK pro tisk/plakát
  - tools/qr.js ................... generátor QR kódu (čisté Node.js, bez
                                    závislostí): --js vypíše matici pro
                                    index.html, --svg uloží obrázek.
                                    Ověřeno shodou s quickchart.io.

Změna podpisového klíče (jen když je potřeba):
  - smazat android/keystore/oopp.jks, spustit build → CI vytvoří nový klíč.
  - POZOR: s novým klíčem nejde instalovat přes starou verzi — je nutné
    aplikaci odinstalovat (data v zařízení se tím smažou; v cloudu zůstávají
    a po přihlášení se stáhnou zpět).
  - Heslo ke klíči je v .github/workflows/android-apk.yml (OOPP_KS_PASS).
    Repozitář je veřejný, takže klíč není tajný — pro interní aplikaci to
    nevadí; kdyby to vadilo, lze klíč i heslo přesunout do GitHub Secrets
    a v buildu je načítat odtamtud.


8) Bez APK — instalace z prohlížeče (PWA)
-----------------------------------------
Když APK nechcete, jde aplikace i nadále „nainstalovat“ z Chrome:
  ⋮ → „Instalovat aplikaci“ / „Přidat na plochu“.
Výhoda APK: vlastní ikona, tisk přes Android, exporty do Stahování,
funguje i tam, kde je prohlížeč omezený správcem zařízení.
