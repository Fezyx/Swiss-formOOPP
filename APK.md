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
2. Záložka Data → karta „☁ Cloud“ → e-mail a heslo uživatele → „🔑 Přihlásit“.
   Ostatní údaje (ID projektu, API klíč) jsou už přednastavené.
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


6) Když se sestavení APK nepovede
---------------------------------
1. GitHub → záložka „Actions“ → „Android APK“ → červený běh → krok, který
   spadl (červený křížek) → text chyby.
2. Nejčastější příčiny: dočasný výpadek GitHubu, změna verze Gradle/Android
   pluginu. Řešení: „Re-run all jobs“, nebo upravit verze v
   android/build.gradle (AGP) a v .github/workflows/android-apk.yml (Gradle).
3. APK z dřívějška funguje dál — aplikace v něm se aktualizuje z webu,
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
