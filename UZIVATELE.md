EVIDENCE OOPP — uživatelé, hesla a práva
========================================

Každý člověk, který vydává OOPP, má vlastní účet: přihlašovací jméno (nick)
a heslo. Díky tomu je v tabulce výdejů vidět, kdo výdej vydal (kolonka
„Vydal“), a v cloudu je poznat, kdo co zapsal. E-maily se nepoužívají —
žádná pozvánka nikam nechodí. Heslo správce nikdy nevidí; umí ho jen smazat.

1) Jak to funguje
-----------------
- Přihlašovací jméno (nick) = malá písmena bez diakritiky, aspoň 3 znaky
  (např. novak, dvorak2). Zakládá ho správce přímo v aplikaci.
- Profil = dokument v kolekci oopp_users a drží jméno, iniciály do kolonky
  „Vydal“, roli (správce / uživatel) a příznak aktivní. Bez profilu se
  uživatel k datům v cloudu nedostane.
- Nick se eviduje v kolekci oopp_logins (nick, práva, číslo verze). Z ní
  aplikace pozná ještě PŘED přihlášením, jestli nick existuje a jestli mu
  správce neodebral přístup. Nejsou v ní žádná data — jen nicky.
- Firebase umí přihlášení jen e-mailem, proto má každý nick vnitřní adresu
  novak@oopp.local. Tu uživatel nikdy nevidí a žádná pošta na ni nechodí.
  Po smazání hesla se adresa změní na novak.v2@oopp.local, takže staré heslo
  přestane platit.
- Přihlášení je v záložce Data → karta „🔒 Přihlášení k datům“ (stejné údaje
  jako u „☁ Cloud“) a v úvodní kartě „☁ Připojení ke cloudu“.
- Vpravo nahoře v hlavičce je odznak „👤 jméno (iniciály)“ s tlačítkem
  „Odhlásit“ — ukazuje, kdo je právě přihlášený (správce i běžný uživatel).
  Odhlášení vymaže z tohoto zařízení jméno, iniciály i práva správce; spojení
  ke cloudu (Firebase) zůstává, aby aplikace mohla dál synchronizovat.
  Na sdíleném tabletu se proto před výdejem přihlaste svým nickem a po skončení
  klikněte „Odhlásit“ — další výdej se pak podepíše tím, kdo se přihlásí.
- Staré místní přihlášení admin/admin funguje dál (pro starší zařízení),
  ale NEDÁVÁ práva správce v cloudu — cloudová práva určuje profil.
  Odemkne ale Data a seznam uživatelů, takže jím lze chybějící práva udělit
  („⭐ Udělat správcem“). To je záchranná cesta, když se práva ztratí.
- Bez přihlášení se nepřidávají ani neupravují zaměstnanci a neukládají se
  předávací protokoly. V hlavičce vedle mráčku ☁ přitom svítí velké
  „PŘIHLÁSTE SE“; klepnutím se otevře přihlašovací karta.

2) Přidání uživatele (jen správce)
----------------------------------
Data → karta „👤 Uživatelé a přístup“:
1. Vyberte Zaměstnanec ze seznamu — z něj se vezme jméno a iniciály
   (Lukáš Dvořák → L.D.). Tím je dané, za koho se dotyčný přihlásí.
2. Napište Přihlašovací jméno (např. novak) a případně práva
   (uživatel / správce).
3. Klikněte „＋ Přidat uživatele“.
4. Sdělte dotyčnému nick (klidně na papírek). On v aplikaci klikne
   „🆕 První přihlášení — vytvořit heslo“, napíše nick a zvolí si heslo
   (aspoň 6 znaků) — nikoho nevybírá, takže se nemůže splést s někým jiným.
   Tím vznikne jeho účet a hned je přihlášený.
5. Hotovo: v tabulce výdejů se podepisuje svými iniciálami.

Co se stane na pozadí: aplikace založí dokument oopp_logins/novak (nick,
práva, číslo verze 1) a prázdný profil v oopp_users. Účet ve Firebase
(novak@oopp.local) vznikne až při prvním přihlášení, s heslem, které si
dotyčný zvolil. Do té doby je u nicku v seznamu „heslo nenastaveno“.

Nick nejde změnit — když má být jiný, uživatele odeberte (🚫 Odebrat)
a přidejte ho znovu pod novým nickem (se stejným jménem).

Oprava jména: u hotového profilu klikněte v seznamu na „✏ Jméno“ a napište
správné jméno — iniciály se přepočítají. Už vydané výdeje si nechávají
iniciály, které byly platné v době výdeje (nic se nepřepisuje zpětně).

3) Zapomenuté heslo — tlačítko „🔑 Smazat heslo“
------------------------------------------------
1. Data → „👤 Uživatelé a přístup“ → u nicku klikněte „🔑 Smazat heslo“.
2. Aplikace zvedne číslo verze nicku a založí nový profil — dosavadní heslo
   přestane platit všude, i na tabletu, kde zůstalo uložené.
3. Dotyčný klikne „🆕 První přihlášení — vytvořit heslo“, napíše stejný nick
   a zvolí si nové heslo. Jméno, iniciály ani práva se nemění.

Správce heslo nikdy nevidí ani nemůže zjistit — může ho jen smazat a nechat
dotyčného zvolit nové. Proto se v seznamu ukazuje jen stav
„heslo nastaveno / nenastaveno“.

4) Odebrání přístupu
--------------------
„🚫 Odebrat“ smaže profil a nick dostane active=false s novým číslem verze:
dotyčný se přestane dostat k datům i s platným heslem a jeho dosavadní účet
ve Firebase přestane platit. Když mu chcete přístup vrátit, přidejte stejný
nick znovu — dotyčný si nastaví nové heslo.

Úplné smazání účtu ve Firebase není potřeba (účet bez profilu nic nevidí);
kdybyste ho chtěli, jde to v konzoli Firebase (Authentication → Users →
⋮ → Delete). Vlastní profil odebrat nelze (tlačítko se u sebe neukazuje) —
jinak byste si zamkli dveře.

4b) Změna práv — „⭐ Udělat správcem“ / „👤 Odebrat správce“
------------------------------------------------------------
V seznamu uživatelů má každý řádek (kromě toho vlastního) tlačítko, kterým
se práva mění přímo v aplikaci — konzole Firebase není potřeba:

- „⭐ Udělat správcem“ — dotyčný uvidí záložky Data (celou), Předměty,
  Objednávky i seznam uživatelů a bude moci přidávat další účty.
- „👤 Odebrat správce“ — účet a podepisování výdejů mu zůstanou, ale Data,
  Předměty, Objednávky a seznam uživatelů se mu zamknou.
- U sebe tlačítko není: vlastní práva správce si nikdo neodebere, aby si
  nezamkl dveře. Odebrat je může jen jiný správce.
- Změna se zapíše do profilu (oopp_users → role) i k nicku (oopp_logins →
  role) a projeví se po nejbližším přihlášení (u vlastního účtu hned).

Práva aplikace pozná takto: rozhoduje role v profilu (oopp_users/…), a když
tam chybí, role u nicku (oopp_logins/…). Do oopp_logins smí zapisovat jen
správce, takže „admin“ tam nastavil skutečný správce — díky tomu nezůstane
správce po přihlášení omylem bez práv.

5) Kolonka „Vydal“ (iniciály)
-----------------------------
- Přihlášený uživatel: do výdeje se uloží jeho iniciály z profilu a hned po
  přihlášení je vidět i v řádku „✍ Vydává:“ v záložce Zaměstnanci (např.
  „L.D. Lukáš Dvořák“). Když v profilu jméno chybí, aplikace se na něj po
  přihlášení jednou zeptá a uloží ho k účtu.
  Tlačítko „✍ Změnit“ u přihlášeného uživatele uloží nové jméno k účtu
  (projeví se i na ostatních zařízeních); správce může totéž udělat v seznamu
  uživatelů tlačítkem „✏ Jméno“.
- Starší místní přihlášení admin/admin: profil v cloudu nemá, takže se aplikace
  na jméno zeptá při přihlášení a uloží ho jen do tohoto zařízení (řádek
  „✍ Vydává“). Pro podepisování výdejů v cloudu se doporučuje nick.
- Nepřihlášené zařízení: iniciály se nastaví tlačítkem „✍ Změnit“ u řádku
  „✍ Vydává:“ v záložce Zaměstnanci a uloží se jen do tohoto zařízení.
- Bez přihlášení (nebo bez profilu) se výdej neuloží — aby v evidenci nebyl
  záznam bez podpisu.
- Když není ani jedno, aplikace se na jméno zeptá při ukládání výdeje.
- Iniciály se ukládají k výdeji (issuedByName, issuedByInitials, issuedByUid,
  issuedAt), takže se později nezmění, ani když se uživatel přejmenuje.

6) První správce (nový projekt)
-------------------------------
1. Ve Firebase Authentication → Users založte první účet (e-mail + heslo).
   To je jediné místo, kde e-mail zůstává — patří správci, který projekt
   zakládá. Další lidi už přidáváte nickem přímo v aplikaci.
2. V aplikaci se přihlaste (Data → „🔒 Přihlášení k datům“) tím e-mailem
   a heslem.
3. V kartě „👤 Uživatelé a přístup“ klikněte „✚ Založit profil správce“
   a napište jméno a příjmení. Tlačítko se ukazuje, jen když v cloudu ještě
   žádný profil není.
4. Od té chvíle přidává další účty správce přímo v aplikaci.

7) Pravidla ve Firestore
------------------------
Pravidla, která drží data v soukromí (oopp_users, oopp, oopp_sig), jsou
v souboru FIREBASE.md → kapitola 2. Navíc je potřeba kolekce oopp_logins:
číst ji smí kdokoli (aplikace z ní před přihlášením zjistí verzi a práva
nicku), zapisovat smí jen správce. Zkráceně: číst a zapisovat data smí jen
přihlášený uživatel, který má profil; profily zapisuje jen správce.
Bez pravidel pro oopp_logins se nick nepřihlásí (permission-denied).

8) Časté potíže
---------------
- „Přihlašovací jméno … není zaregistrované“ — nick v oopp_logins není
  (správce ho ještě nepřidal), nebo je překlep; nick se píše malými písmeny
  bez diakritiky (Novák → novak).
- „Heslo už je nastavené“ — dotyčný už heslo má, ať se jím přihlásí. Když ho
  nezná, správce ho smaže tlačítkem „🔑 Smazat heslo“ a dotyčný si zvolí nové.
- „Tomuto přihlašovacímu jménu správce odebral přístup“ — nick má odebraný
  přístup (🚫 Odebrat). Správce ho znovu přidá stejným nickem.
- „Přihlášený účet zatím nemá profil“ — e-mail existuje, ale chybí dokument
  v oopp_users (typicky první správce). V přihlašovací kartě se objeví rámeček
  s tlačítkem „✚ Založit profil správce“ (když je cloud prázdný nebo jste
  správce) a s tlačítkem „📋 Kopírovat ID profilu“ — jinak požádejte správce
  o přidání.
- „Jsem přihlášený jako správce, ale nemám práva“ — poznáte to podle odznaku
  vpravo nahoře („· uživatel“ místo „· správce“) a podle hlášky v přihlašovací
  kartě. Nejčastěji je to tak, že účet má nick s právy uživatele, nebo profil
  nemá roli. Postup opravy:
  1. Odhlaste se a přihlaste se nickem, který práva správce mít má.
  2. Když ani tak práva nejsou: přihlaste se místním admin/admin, otevřete
     Data → „👤 Uživatelé a přístup“ a u svého řádku klikněte
     „⭐ Udělat správcem“.
  3. Když se nedaří ani to (nebo v seznamu řádek chybí), opravte to v konzoli
     Firebase: Firestore → oopp_users → dokument s ID rovným vaší vnitřní
     adrese (např. novak@oopp.local, po smazání hesla novak.v2@oopp.local,
     u vlastního e-mailu malými písmeny) → přidejte/upravte
     role = admin, active = true, name, initials. Stejně nastavte
     oopp_logins → novak → role = admin. Pak se znovu přihlaste.
     Přesné ID profilu vám aplikace napíše do hlášky po přihlášení a dá se
     zkopírovat tlačítkem „📋 Kopírovat ID profilu“.
  4. Role v profilu jde měnit jen správcem (pravidla ve Firestore) — sám si
     ji uživatel přepsat nemůže.
- „Missing or insufficient permissions“ — chybí pravidla z FIREBASE.md
  (hlavně veřejné čtení oopp_logins), nebo účet nemá profil.
- Data se nesynchronizují — v kartě „☁ Cloud“ klikněte „🔑 Přihlásit“
  a pak „⟳ Synchronizovat“.

