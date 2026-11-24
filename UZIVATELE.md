EVIDENCE OOPP — uživatelé, hesla a práva
========================================

Každý člověk má v aplikaci vlastní účet (e-mail + heslo). Díky tomu je
v tabulce výdejů vidět, kdo výdej vydal (kolonka „Vydal“), a v cloudu je
poznat, kdo co zapsal. Správce hesla nikdy nevidí — jen je posílá a obnovuje.

1) Jak to funguje
-----------------
- Účet = e-mail + heslo. Účet a heslo spravuje Firebase Authentication.
- Profil = dokument v kolekci oopp_users (ID = e-mail malými písmeny) a drží
  jméno, iniciály do kolonky „Vydal“, roli (správce / uživatel) a příznak
  aktivní. Bez profilu se uživatel k datům v cloudu nedostane.
- Přihlášení je v záložce Data → karta „🔒 Přihlášení k datům“ (stejné údaje
  jako u „☁ Cloud“) a v úvodní kartě „☁ Připojení ke cloudu“.
- Vpravo nahoře v hlavičce je odznak „👤 jméno (iniciály)“ s tlačítkem
  „Odhlásit“ — ukazuje, kdo je právě přihlášený (správce i běžný uživatel).
  Odhlášení vymaže z tohoto zařízení jméno, iniciály i práva správce; spojení
  ke cloudu (Firebase) zůstává, aby aplikace mohla dál synchronizovat.
  Na sdíleném tabletu se proto před výdejem přihlaste svým účtem a po skončení
  klikněte „Odhlásit“ — další výdej se pak podepíše tím, kdo se přihlásí.
- Staré místní přihlášení admin/admin funguje dál (pro starší zařízení),
  ale NEDÁVÁ práva správce v cloudu — cloudová práva určuje profil.

2) Přidání uživatele (jen správce)
----------------------------------
Data → karta „👤 Uživatelé a přístup“:
1. Vyplňte Jméno a příjmení (z něj se udělají iniciály: Lukáš Dvořák → L.D.),
   e-mail a práva (uživatel / správce).
2. Klikněte „＋ Přidat uživatele“.
3. Na e-mail odejde pozvánka s odkazem. Uživatel klikne, ve formuláři si zvolí
   heslo a doplní, co jste nevyplnili (jméno, telefon) — pak se přihlásí.
4. Hotovo: v tabulce výdejů se podepisuje svými iniciály.

Formulář v e-mailu = stránka pozvanka.html. Aby odkaz mířil na ni (a ne na
stránku Firebase), nastavte ji jednou v konzoli — postup je ve FIREBASE.md,
kapitola „2.1 Pozvánka e-mailem“. Bez toho pozvánka funguje taky, jen se
uživatel nastaví heslo na stránce Firebase a jméno mu zůstane od správce.

Co se stane na pozadí: aplikace založí účet s náhodným heslem, které se nikam
neukládá ani nezobrazuje, a hned pošle odkaz pro zvolení skutečného hesla.
Kdyby e-mail nedošel, účet už existuje — pošlete odkaz znovu tlačítkem
„✉ Nové heslo“.

E-mail nedorazil? V seznamu uživatelů je u jména čas posledního odeslání
(„✉ 24. 11. 14:05“) — když tam je, Firebase e-mail přijal a problém je
v doručení:
- podívejte se do SPAMU / hromadné pošty; odesílatel je
  noreply@swissformoopp.firebaseapp.com (ne firemní adresa),
- zkontrolujte překlep v e-mailu (v seznamu je vidět, kam se posílalo),
- firemní pošta (Seznam, Centrum) občas zprávy z firebaseapp.com zahazuje —
  zadejte osobní adresu (Gmail), přihlašovací e-mail nemusí být firemní,
- odkaz platí 1 hodinu; po vypršení pošlete nový tlačítkem „✉ Nové heslo“,
- účet musí existovat ve Firebase → Authentication → Users (odkaz je
  v nápovědě pod formulářem „Přidat uživatele“).

Když je u jména „e-mail neodešel“, aplikace se pokusila odeslat, ale Firebase
to odmítl (nejčastěji denní limit 150 e-mailů na plánu Spark). Zkuste to
později nebo pošlete odkaz znovu.

Oprava jména: u hotového profilu klikněte v seznamu na „✏ Jméno“ a napište
správné jméno — iniciály se přepočítají. Už vydané výdeje si nechávají
iniciály, které byly platné v době výdeje (nic se nepřepisuje zpětně).

3) Zapomenuté heslo
-------------------
Data → „👤 Uživatelé a přístup“ → u jména klikněte „✉ Nové heslo“. Uživateli
přijde e-mail s odkazem, kde si zvolí nové heslo. Správce heslo nevidí ani
nemůže zjistit — může ho jen poslat znovu.

4) Odebrání přístupu
--------------------
„🚫 Odebrat“ smaže profil: uživatel se přestane dostat k datům v cloudu
(i s platným heslem), ale účet ve Firebase zůstane. Úplné smazání účtu jde
v konzoli Firebase (Authentication → Users → ⋮ → Delete). Vlastní profil
odebrat nelze (tlačítko se u sebe neukazuje) — jinak byste si zamkli dveře.

5) Kolonka „Vydal“ (iniciály)
-----------------------------
- Přihlášený uživatel: do výdeje se uloží jeho iniciály z profilu.
  Tlačítko „✍ Změnit“ u přihlášeného uživatele uloží nové jméno k účtu
  (projeví se i na ostatních zařízeních); správce může totéž udělat v seznamu
  uživatelů tlačítkem „✏ Jméno“.
- Nepřihlášené zařízení: iniciály se nastaví tlačítkem „✍ Změnit“ u řádku
  „✍ Vydává:“ v záložce Zaměstnanci a uloží se jen do tohoto zařízení.
- Když není ani jedno, aplikace se na jméno zeptá při ukládání výdeje.
- Iniciály se ukládají k výdeji (issuedByName, issuedByInitials, issuedByUid,
  issuedAt), takže se později nezmění, ani když se uživatel přejmenuje.

6) První správce (nový projekt)
-------------------------------
1. Ve Firebase Authentication → Users založte první účet (e-mail + heslo).
2. V aplikaci se přihlaste (Data → „🔒 Přihlášení k datům“).
3. V kartě „👤 Uživatelé a přístup“ klikněte „✚ Založit profil správce“
   a napište jméno a příjmení. Tlačítko se ukazuje, jen když v cloudu ještě
   žádný profil není.
4. Od té chvíle přidává další účty správce přímo v aplikaci.

7) Pravidla ve Firestore
------------------------
Pravidla, která drží data v soukromí (oopp_users, oopp, oopp_sig), jsou
v souboru FIREBASE.md → kapitola 2. Zkráceně: číst a zapisovat data smí jen
přihlášený uživatel, který má profil; profily zapisuje jen správce.

8) Časté potíže
---------------
- „Přihlášený účet zatím nemá profil“ — e-mail existuje, ale chybí dokument
  v oopp_users. Správce ho přidá formulářem (stejný e-mail) nebo uživatel
  klikne na „✚ Založit profil správce“, pokud je v cloudu prázdno.
- „Missing or insufficient permissions“ — chybí pravidla z FIREBASE.md,
  nebo účet nemá profil.
- Pozvánka nedošla — zkontrolujte spam a tlačítko „✉ Nové heslo“.
- Data se nesynchronizují — v kartě „☁ Cloud“ klikněte „🔑 Přihlásit“
  a pak „⟳ Synchronizovat“.
