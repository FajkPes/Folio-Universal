# Folio Universal

Otevři **Folio_Universal.html** v aktuálním prohlížeči. Je to samostatný přenositelný soubor pod 1 000 000 bajtů, včetně vložených knihoven. Nepotřebuje instalaci, server, HTTPS ani připojení k internetu. Ostatní soubory v této složce jsou zdrojové a testovací; ke spuštění je nepotřebuješ.

- **MD:** nadpisy, seznamy, tabulky, odkazy, obrázky, bezpečné HTML a sbalování sekcí.
- **TXT:** doslovný text včetně odsazení. Podobně fungují JSON, INI a další nabízené textové přípony, bez speciální interpretace.
- **DOCX:** společný čtecí styl s Markdownem, nadpisy, seznamy, tabulky a vložené obrázky. Nejde o přesnou kopii sazby Wordu. Styly Title a Heading se převádějí na nadpisy; ručně zvětšený text bez stylu nemusí vytvořit kapitolu.
- **DOC:** text bez původního formátování. Ne všechny varianty starého Wordu lze zpracovat.
- **PDF:** vykreslení stránek, navigace podle záložek nebo stránek, hledání a kopírování existujícího textu. Bez OCR, úprav formulářů a záruky všech vzácných fontů a kodeků.

Tlačítko **▤** otevře knihovnu deseti dokumentů. Až čtyři lze připnout. Nepřipnuté se při naplnění vyřazují od nejdéle neotevřeného. Stejný název aktualizuje existující kopii pouze při změně obsahu; změněný dokument začíná znovu nahoře. Posun ukládá jen metadata. Komprese se použije, pokud obsah zmenší.

**Knihovna patří prohlížeči, není uvnitř HTML.** Přesun HTML na jinou cestu, nová verze, jiný prohlížeč či anonymní režim nemusí mít stejnou paměť. Použij **Export knihovny / Obnovit zálohu** pro přenos a zálohování. Připnutí brání vyřazení aplikací, nikoli smazání dat prohlížečem. Volba Chránit úložiště žádá prohlížeč o trvalé uložení, které nemusí povolit.

Na telefonu musí soubor otevřít prohlížeč, který spouští lokální HTML a JavaScript; systémový náhled nemusí fungovat. Komprimovaná aplikace vyžaduje podporu `DecompressionStream`. Fyzický telefon nebyl při vývoji dostupný; mobilní rozložení bylo ověřeno při šířce 390 px v Edge/Chromiu. Externí obrázky v Markdownu mohou potřebovat internet.

## Ověření

Testováno přímo přes `file://` v Edge/Chromiu:

- oba dodané DOCX a oba MD; stejná hierarchie a počty nadpisů v odpovídajících dvojicích (230 a 150), společná typografie;
- vyhledávání, kompaktní mobilní rozložení, fullscreen a návrat na místo čtení;
- 5 001 nadpisů / 10 001 bloků, omezený počet vykreslených bloků;
- přepočet výšky po rozbalení sekcí;
- deset dokumentů, připnutí, komprese, aktualizace změněného souboru a nepřepisování nezměněného obsahu;
- dvoustránkové PDF s textem, starý DOC s Unicode, přepínání formátů;
- obnovení knihovny po reloadu a import zálohy v čistém profilu;
- blokovaný síťový přístup: žádný síťový požadavek pro spuštění a čtení testovacího PDF.

Testy nepotvrzují všechny možné dokumenty ani všechny mobilní prohlížeče. Časová osa používá stabilní váhy podle množství textu (u PDF podle stránek), nikoli postupně doměřovanou výšku stránky. Hranice se během čtení nepřesouvají; sbalení sekcí je přepočítá. Nativní posuvník prohlížeče stále odpovídá výšce stránky.

V nastavení lze zapnout automatické sledování čtené kapitoly v obsahu (výchozí stav vypnutý), zobrazit záložku Odkazy (výchozí stav skrytý) a upravit čísla podnadpisů nebo skrýt jejich linky (výchozí stav beze změn). Úpravy jsou pouze vizuální, zachovávají kotvy a čísla mimo nadpisy. Hlavní úroveň kapitol se určuje podle hierarchie dokumentu. PDF se vizuálně nepřepisuje.

Při otevření se odpovídající sekce standardně sbalí kromě sekce obsahující poslední pozici a jejích nadřazených sekcí. Tuto volbu lze vypnout a obnovovat předchozí rozbalení. DOCX se ukládá v původním ZIP formátu bez dalšího gzip zpracování; dříve komprimované kopie lze nadále načíst. Knihovna uvádí uloženou velikost a úsporu.

Žlutá uložená značka používá stejný výpočet jako časová osa i po automatickém uložení. Během skoku, změny rozložení nebo obnovování se mezilehlá pozice neukládá. Konec dokumentu se pamatuje výslovně a obnoví se na konci i při změně rozložení nebo sbalení sekcí. Změna sbalení může změnit procento téhož místa, protože se mění množství viditelného obsahu.

## Opravy navigace

Časová osa zobrazuje skutečná čísla z názvů hlavních kapitol. Na číslo lze kliknout. Kompaktní pruh má 18 px a nepřekrývá patičku ani nabídku. V nastavení lze čísla umístit těsně nad tenkou osou nebo přímo dovnitř; volba se pamatuje. Barva čísel odpovídá světlému či tmavému vzhledu. Pokud se čísla nevejdou, některé popisky se vynechají, aby se nepřekrývaly; značky a názvy při najetí zůstávají. Procenta jsou uprostřed uvnitř pruhu.

Položky obsahu při průběžném vykreslování zůstávají stejné, takže kliknutí nepřeskočí na nahrazený řádek. Skok se opakovaně zarovná podle skutečné výšky cílového bloku. Aktivní kapitola zahrnuje i nadpis těsně pod horním okrajem.

Neplatné interní odkazy z Wordu se opravují podle jednoznačné shody textu odkazu s nadpisem. Existující záložky mají přednost; při nejednoznačné shodě se cíl nehádá. Samostatné prázdné kotvy Markdownu vedou na následující obsah. Klikací testy ověřují 102 odkazů napříč dodanými čtyřmi soubory a skoky do sbalených i vzdálených kapitol.

## Zdrojové soubory

`universal.js` a `universal.css` rozšiřují původní Folio, které zůstalo beze změny. `build_universal.py` sestaví výsledný HTML soubor a nebalený vývojový `Folio_Universal.debug.html`. `vendor` obsahuje knihovny. `test_universal.cjs`, `test_extended.cjs` a `test-results` obsahují kontroly a jejich výsledky. Distribuuj pouze `Folio_Universal.html`.
