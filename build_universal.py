from pathlib import Path
import base64, re, gzip, html, subprocess

root = Path(__file__).parent
source = (root / 'Folio_fullscreen_v3.html').read_text(encoding='utf-8')
source = source.replace('function render(){', 'function renderBase(){', 1)
# Keep the original parser, virtual layout, settings, and folding implementation.
# New function declarations supersede the original adapters in the same script.
source = source.replace('</style>', '\n' + (root / 'universal.css').read_text(encoding='utf-8') + '\n</style>', 1)
source = source.replace('Folio — Markdown čtečka', 'Folio Universal — čtečka dokumentů')
source = source.replace('Markdown reader', 'Universal reader').replace('Otevřít .md', 'Otevřít soubor')
source = source.replace('aria-label="Markdown dokument"', 'aria-label="Dokument"')
source = source.replace('<button id="theme"', '<button id="libraryBtn" title="Poslední dokumenty" aria-label="Knihovna dokumentů">▤</button><button id="theme"', 1)
source = source.replace('accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"', 'accept=".md,.markdown,.mdown,.txt,.pdf,.doc,.docx,.ini,.json,.log,.csv,.yaml,.yml,.xml,.html,.htm,.css,.js,.ts"')
source = source.replace('<div id="progress"></div>', '<div id="progress"></div><canvas id="chapterTicks" aria-hidden="true"></canvas><span id="timelineBadge">0 %</span>')
source = source.replace('<span id="lastReadLabel"></span>', '<button id="lastReadLabel" title="Přejít na uložené místo"></button>')
source = source.replace('Žlutá značka dole ukazuje poslední místo pro soubor se stejným názvem; dokument vždy začne nahoře.', 'Žlutá značka ukazuje uložené místo. Při otevření dokument pokračuje na uložené pozici.')
source = source.replace('Markdown soubor se nemění.', 'Původní soubor se nemění. Knihovnu lze zálohovat a obnovit i v jiné verzi Folia.')
help_start = source.index('<h2>Čtení bez zbytečností.</h2>')
help_end = source.index('<details><summary>Licence</summary>', help_start)
source = source[:help_start] + '''<h2>Jeden prostor pro tvoje dokumenty.</h2>
<p><b>Markdown</b> zachovává nadpisy, tabulky, seznamy, odkazy a bezpečné HTML. <b>TXT a další textové soubory</b> zobrazují doslovný text včetně mezer. UTF-8 a UTF-16 s BOM se rozpoznají automaticky, starší text používá Windows-1250.</p>
<p><b>DOCX</b> zachovává významové formátování, tabulky a vložené obrázky ve sjednoceném čtecím stylu. Rozvržení stránek, plovoucí objekty a některé styly Wordu se mohou lišit. <b>Starý DOC</b> podporuje získání textu, nikoli původního formátování; chráněné nebo neobvyklé soubory nemusí být podporované.</p>
<p><b>PDF</b> se vykresluje po stránkách. Obsah využívá záložky PDF, jinak čísla stránek. Hledání pracuje s existující textovou vrstvou; naskenované stránky lze prohlížet, ale bez OCR v nich nelze hledat. Text pod stránkou lze rozbalit a kopírovat. Některé vzácné fonty a obrazové kodeky nemusí být v offline režimu dostupné.</p>
<p><b>Knihovna ▤</b> ukládá nejvýše 10 souborů. Až 4 připnuté dokumenty se automaticky nevyřazují, ostatní se nahrazují od nejdéle neotevřeného. Stejný název znamená stejný dokument: při změně obsahu se uložená kopie nahradí a pozice resetuje. Při čtení se ukládají jen metadata, nikoli celý soubor.</p>
<p><b>Paměť prohlížeče není záloha.</b> Anonymní režim, čištění dat a mobilní náhledy mohou paměť smazat či oddělit. Otevírej stále stejné HTML ve stejném prohlížeči. Přesun mezi verzemi, zařízeními a prohlížeči zajistí Export / Obnovit v knihovně. Nová lokální cesta nemusí sdílet úložiště. Připnutí brání vyřazení aplikací, nikoli vymazání prohlížečem.</p>
<p><b>Telefon:</b> ☰ otevře kapitoly a hledání. ⛶ skryje lišty; × nebo Escape vrátí běžný režim. Prohlížeč musí podporovat spouštění lokálního HTML. Systémový náhled souboru nemusí fungovat.</p>
<p><b>Časová osa:</b> tenké čáry oddělují hlavní kapitoly. Osamocený nadpis první úrovně se považuje za název dokumentu, další úroveň za hlavní kapitoly. Kliknutí přesune čtení; prostřední číslo udává procenta. Délka se při měření a sbalování zpřesňuje. Žlutá značka ukazuje uložené místo.</p>
<p>Hledání Ctrl+F prochází také skryté a nevykreslené části. Zobrazuje odpovídající bloky a zvýrazňuje shody. Sbalování nastavíš podle nadpisů přes ⚙. Externí obrázky v Markdownu potřebují internet; dokumenty samotné se na server neposílají. Limit jednoho souboru je 200 MB, praktický limit závisí na zařízení.</p>
<p>Použité knihovny: <a href="https://github.com/markedjs/marked">Marked</a>, <a href="https://github.com/mwilliamson/mammoth.js">Mammoth</a>, <a href="https://mozilla.github.io/pdf.js/">PDF.js</a>, <a href="https://github.com/morungos/node-word-extractor">word-extractor</a>.</p>
''' + source[help_end:]
license_text='\n\n'.join(p.read_text(encoding='utf-8',errors='replace') for p in [root/'vendor/MAMMOTH-LICENSE',root/'vendor/PDFJS-LICENSE',root/'build-tools/node_modules/word-extractor/LICENSE',root/'vendor/DEPENDENCY-LICENSES'])
source=source.replace('<details><summary>Licence</summary>', '<details><summary>Licence převodníků DOC, DOCX a PDF</summary><pre style="white-space:pre-wrap;font-size:11px">'+html.escape(license_text)+'</pre></details><details><summary>Licence</summary>',1)
dialogs = '''<dialog id="library" aria-labelledby="libraryTitle"><button class="close" id="closeLibrary">Zavřít</button><h2 id="libraryTitle">Tvoje knihovna</h2><p class="library-intro">Rozečtené dokumenty. Přesně tam, kde jsi skončil.</p><div class="library-actions"><button id="libraryOpen" class="primary">Otevřít soubor</button><button id="backupExport">Export knihovny</button><button id="backupImport">Obnovit zálohu</button><button id="persistStorage">Chránit úložiště</button></div><p id="storageStatus" role="status"></p><div id="libraryList"></div><p class="library-intro" style="font-size:12px">10 dokumentů · 4 připnuté. Paměť patří tomuto prohlížeči. Pro přenos do nové verze HTML a pro zálohu použij export. Připnutí nebrání vymazání dat prohlížečem.</p><input id="backupFile" type="file" accept=".json" hidden></dialog>
<dialog id="pdfPassword"><form method="dialog"><h2>Heslo PDF</h2><p id="passwordInfo"></p><input id="passwordValue" type="password" autocomplete="off" aria-label="Heslo PDF"><button value="cancel">Zrušit</button><button value="open" class="primary">Otevřít</button></form></dialog>'''
libraries = [('mammoth-source','mammoth.browser.js'),('doc-source','doc.browser.js'),('pdf-source','pdf.mjs'),('pdf-worker-source','pdf.worker.mjs')]
for id, filename in libraries:
    library_source=(root/'vendor'/(filename+'.min')).read_text(encoding='utf-8').replace('</script','<\\/script')
    dialogs += '\n<script id="'+id+'" type="text/plain" data-raw="true">'+library_source+'</script>\n'
source = source.replace('<script id="worker-source"', dialogs+'\n<script id="worker-source"', 1)
pos = source.index("load(demo+'\\n## Vybraná díla")
end = source.index('\n</script>', pos)
universal=(root/'universal.js').read_text(encoding='utf-8')
universal=universal.replace('chapterDepth=chooseChapterDepth();let number=0;for(const h of data.toc)if(h.depth<=chapterDepth)h.number=String(++number).padStart(2,\'0\');','chapterDepth=chooseChapterDepth();prepareNavigation();')
source = source[:pos] + universal + '\n'+(root/'navigation.js').read_text(encoding='utf-8') + '\n'+(root/'reader-options.js').read_text(encoding='utf-8') + '''
load('# Folio Universal\\n\\n## Všechno tvoje čtení. Na jednom místě.\\n\\nOtevři **Markdown, text, PDF nebo Word**. Knihovna **▤** si dokument zapamatuje a příště naváže tam, kde jsi skončil.\\n\\n> Dokument zůstává v tomto prohlížeči. Bez účtu, bez nahrávání na server.\\n\\n## Méně lišt, více prostoru\\n\\nNa telefonu najdeš obsah pod **☰**. Tlačítko **⛶** otevře nerušené čtení. Velikost textu nastavíš pomocí **Aa**, vzhled a sbalování přes **⚙**.\\n\\n### Přehledné kapitoly\\n\\nHlavní kapitoly mají výraznější řádek, podkapitoly odsazení a vodicí linku. Čárky dole ukazují hranice hlavních kapitol.\\n\\n### Hledání v celém dokumentu\\n\\nPoužij kartu **Hledat** nebo **Ctrl+F**. Prohledávají se i části, které zrovna nejsou na obrazovce.\\n\\n## Tvoje malá knihovna\\n\\nPamatuje si **10 dokumentů**, z toho můžeš **4 připnout**. Obsah se komprimuje, jen když to šetří místo. Posouvání ukládá pouze pozici.\\n\\nPři aktualizaci souboru se stejným názvem se nahradí uložená verze. Zálohu knihovny si můžeš exportovat a obnovit v novém HTML.\\n\\n## Každý formát má svoje pravidla\\n\\n**MD a DOCX** používají společný čtecí styl. **TXT** zůstává doslovným textem. **PDF** zachovává stránky. **DOC** se otevírá jako text bez původního formátování. Podrobnosti a omezení najdeš v nápovědě.\\n','Průvodce čtečkou').catch(e=>notify(e.message));
''' + source[end:]
(root/'Folio_Universal.debug.html').write_text(source,encoding='utf-8')
# Validate and compact only executable app JS; keep readable sources separately.
def compact_script(match):
    result=subprocess.run(['node',str(root/'build-tools/pack-main.cjs')],input=match.group(1),text=True,encoding='utf-8',capture_output=True,check=True)
    return '<script>'+result.stdout.replace('</script','<\\/script')+'</script>'
source=re.sub(r'<script>([\s\S]*?)</script>',compact_script,source)
payload=base64.b64encode(gzip.compress(source.encode(),compresslevel=9,mtime=0)).decode()
packed='''<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Folio Universal</title><body style="font-family:system-ui;background:#10151e;color:#e2e8f0;padding:24px"><p id="boot">Otevírám Folio…</p><script>
(async()=>{try{if(!globalThis.DecompressionStream)throw Error('Tato verze potřebuje novější prohlížeč s podporou DecompressionStream.');const bytes=Uint8Array.from(atob('''+repr(payload)+'''),c=>c.charCodeAt(0));const html=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();document.open();document.write(html);document.close();}catch(e){document.getElementById('boot').textContent='Folio nelze spustit: '+e.message;}})();</script></body></html>'''
(root/'Folio_Universal.html').write_text(packed,encoding='utf-8')
assert (root/'Folio_Universal.html').stat().st_size<1_000_000,'Portable HTML exceeds the 1 MB requirement'
print('Built Folio_Universal.html:',len(packed.encode()),'bytes')
