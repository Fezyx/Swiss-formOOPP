EVIDENCE OOPP — iPhone / iPad (iOS)
===================================

Aplikace je stejná webová stránka jako na Androidu. Na iOS existují dvě cesty:

  A) zdarma a hned — otevřít v Safari a přidat na plochu (PWA),
  B) „stejné jako APK“ — nativní iOS obal (WKWebView) a instalace přes
     TestFlight / App Store / firemní distribuci.


1) Cesta A: instalace na plochu z Safari (zdarma, bez Applu)
------------------------------------------------------------
1. Na iPhonu / iPadu otevřete v Safari adresu
   https://fezyx.github.io/Swiss-formOOPP/
   (v Chrome ani Firefoxu na iOS to nejde — „Přidat na plochu“ umí jen Safari)
2. Klepněte na tlačítko Sdílet ⬆ → „Přidat na plochu“ → „Přidat“.
3. Hotovo: na ploše je ikona OOPP, aplikace se otevírá bez adresního řádku
   a funguje i offline (po prvním načtení s internetem).

Co funguje stejně jako v APK:
- offline režim a automatická aktualizace z webu (oranžový mráček ☁),
- data v zařízení + cloud (Firebase), podpisy se po nahrání z device mažou,
- tisk knížky / potvrzení (dialog iPhonu umí i „Uložit jako PDF“),
- sdílení knížky (WhatsApp, e-mail): PDF se předá systémovému dialogu „Sdílet“,
- import zálohy (výběr souboru z aplikace Soubory).

Kde se iOS chová jinak (jinak to na iOS nejde ani v nativní aplikaci):
- Export PDF / CSV / záloha: soubor se neukládá „do Stahování“, ale přes
  dialog „Sdílet“ → „Uložit do Souborů“ (aplikace Soubory). Hlášky v aplikaci
  proto na iOS píšou „Soubory“ místo „Stahování“.
- Výběr složky na SD kartu / USB (File System Access API) na iOS neexistuje —
  aplikace tuto volbu automaticky skrývá (supportsFS() = false).
- Tlačítko „Zpět“ v Androidu nahrazuje gesto přejetí od levého okraje.


2) Cesta B: nativní iOS obal („to stejné co APK“)
--------------------------------------------------
APK je jen obal: MainActivity.java + WebView, který aplikaci načte a přidá
nativní tisk, ukládání souborů, sdílení a tlačítko Zpět. Pro iOS platí totéž,
jen v Swiftu: WKWebView + most do JavaScriptu (window.OOPPiOS).

Webová část (index.html) je na to už připravená — když obal vloží objekt
window.OOPPiOS, aplikace sama pozná, že běží v iOS aplikaci (isIOSShell()),
a použije nativní cesty:

  window.OOPPiOS.saveFile(jmeno, base64, mime)   ... uloží export (PDF, CSV, záloha)
  window.OOPPiOS.printPage(titulek)              ... tisk / „Uložit do PDF“
  window.OOPPiOS.shareFile(jmeno, base64, mime)  ... dialog Sdílet s přílohou
  window.OOPPiOS.openUrl(url)                    ... mailto:, sms:, https://wa.me/…
  window.__ooppBack()                            ... co má zavřít gesto Zpět

Co musí obal umět (obdoba metod v MainActivity.java):
- načtení aplikace: ideálně z lokálního souboru v bundlu (viz bod 3, pravidlo 2.5.2),
- uložení souboru: UIDocumentPickerViewController („Uložit do Souborů“) nebo
  UIActivityViewController (Sdílet),
- tisk: UIPrintInteractionController s UIMarkupTextPrintFormatter (umí PDF),
- otevření odkazu: UIApplication.shared.open (mailto:, sms:, wa.me),
- import zálohy: <input type="file"> ve WKWebView funguje sám (document picker),
- klávesnice / bezpečné okraje: WKWebView + viewport-fit=cover jsou připravené.

Co v repozitáři pro iOS zatím chybí:
- složka ios/ (Xcode projekt) — zdrojové soubory obalu,
- workflow .github/workflows/ios-testflight.yml (build na macOS runneru),
- podpisový certifikát a provisioning profile (App Store Connect).


3) App Store: co to obnáší
--------------------------
- Apple Developer Program: 99 USD / rok (pro firmu navíc D-U-N-S).
- Build jde jen na macOS + Xcode; na Windows to udělá CI:
  GitHub Actions (runner macos-latest) nebo Codemagic / Bitrise.
- App Store Connect → TestFlight (interní testeři, buildy platí 90 dní)
  → revize Apple (1–3 dny, každá další verze znovu).
- Riziko zamítnutí:
  * 4.2 „Minimum Functionality“ — appka, která je jen zabalený web, se
    zamítá. Řešení: přidat nativní funkce (nativní tisk a PDF přes PDFKit,
    nativní podpis prstem, skener QR, Face ID pro správce, upozornění).
  * 2.5.2 — aplikace nesmí stahovat a spouštět kód z internetu. APK se dnes
    načítá z GitHub Pages a sám se aktualizuje; v App Store verzi musí být
    index.html + dependencies/ uvnitř aplikace a aktualizace chodí přes
    App Store (výhoda samoaktualizace jako u APK tím zmizí).
  * Veřejný App Store = kdokoli si aplikaci stáhne (i s konfigurací Firebase
    v index.html). Pro interní firemní nástroj to obvykle není vhodné.

Pro interní použití (bez veřejného App Store):
- TestFlight — interní testeři, bez revize; buildy ale expirují po 90 dnech.
- Apple Business Manager → Custom Apps — privátní distribuce jen vaší
  organizaci, revizí projde, ale není veřejně v katalogu.
- Apple Developer Enterprise Program — interní distribuce mimo App Store
  (firma 100+ zaměstnanců, D-U-N-S, přísná pravidla).
- Ad Hoc — max 100 zařízení za rok, ručně zapsané UDID.
- MDM (Intune / Jamf) — profil s ikonou na ploše, zdarma a bez Applu.
- PWA (cesta A) — zdarma, funguje dnes.


4) Checklist při testování na iPhonu (cesta A)
----------------------------------------------
1. Přidat na plochu v Safari → otevřít z ikony (bez adresního řádku).
2. Vypnout internet → aplikace se načte z offline paměti.
3. Přihlásit cloud (přihlašovací jméno + heslo) → data se sloučí s ostatními zařízeními.
4. Podepsat výdej prstem → podpis se uloží, po nahrání do cloudu zmizí z device.
5. Tisk knížky → v dialogu „Uložit jako PDF“ → zkontrolovat, že jsou podpisy.
6. Export PDF / CSV / záloha → „Sdílet“ → „Uložit do Souborů“.
7. Sdílet knížku → WhatsApp / e-mail (PDF musí být přílohou).
8. Import zálohy → vybrat JSON ze Souborů.
9. Otevřít aplikaci po týdnu nečinnosti (data drží cloud i zařízení).

Poznámky pro iOS, které se v kódu řeší automaticky:
- PDF se generuje v zařízení (vlastní PDF 1.4 + JPEG stránky). Kdyby Safari
  stránky nevykreslilo, aplikace prázdné PDF odmítne a poradí tisk
  (canvasLooksBlank v index.html) — prázdný dokument se tak nikomu nepošle.
- ukládání do localStorage má na iOS limit ~5 MB; podpisy proto žijí v cloudu
  a v zařízení zůstává jen fajfka „✔ podepsáno“.
- aplikace přidaná na plochu není vystavená sedmidennímu mazání dat, které
  Safari dělá u běžně navštěvovaných webů; cloud je ale i tak jistota.


5) Kontrola v repozitáři
------------------------
  node tools/ios-check.js

Skript (bez prohlížeče) ověří:
- detekci iOS pro iPhone, iPad, iPadOS (hlásí se jako Mac), Mac, Android,
  Windows i pro nativní obal (window.OOPPiOS),
- že se exporty na iOS hlásí jako „Soubory“ a jinde jako „Stahování“,
- že verze v index.html (APP_VERSION) a název cache v sw.js (CACHE) sedí.


