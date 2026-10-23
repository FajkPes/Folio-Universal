const {chromium}=require(process.env.FOLIO_PLAYWRIGHT || 'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const fixture=await context.newPage();await fixture.setContent('<html><body><h1>Offline PDF test</h1><p>Searchable albatross text.</p><div style="page-break-before:always"><h1>Second page</h1><p>Last page.</p></div></body></html>');await fixture.pdf({path:'test-results/sample.pdf'});await fixture.close();
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));await context.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
 await page.goto(pathToFileURL(path.resolve('Folio_Universal.html')).href);await page.waitForFunction(()=>window.folioMetrics);
 await page.locator('#file').setInputFiles('test-results/sample.pdf');
 await page.waitForFunction(()=>documentName==='sample.pdf'&&!opening,{},{timeout:60000});await page.waitForTimeout(1000);
 assert.equal(await page.evaluate(()=>pdfDocument.numPages),2);assert(await page.locator('canvas[aria-label="Strana 1"]').count());
 assert(!(await page.locator('#visible').innerText()).includes('nepodařilo'));
 await page.screenshot({path:'test-results/pdf.png'});
 await page.locator('[data-tab=search]').click();await page.locator('#query').fill('albatross');await page.waitForTimeout(400);assert(await page.locator('.navrow').count());await page.locator('.navrow').first().click();await page.waitForTimeout(300);assert(await page.locator('mark').count());
 await page.locator('[data-tab=toc]').click();
 // Reload the actual file URL and restore the remembered original bytes.
 await page.evaluate(async()=>{await jump(1);readingTouched=true;saveDocumentState();});await page.waitForTimeout(300);
 await page.reload();await page.waitForFunction(()=>window.folioMetrics);await page.locator('#libraryBtn').click();await page.locator('.library-open').filter({hasText:'sample.pdf'}).click();await page.waitForFunction(()=>documentName==='sample.pdf'&&!opening);assert(await page.evaluate(()=>!!documentState.last));
 const downloadPromise=page.waitForEvent('download');await page.locator('#libraryBtn').click();await page.locator('#backupExport').click();const dl=await downloadPromise;await dl.saveAs('test-results/library-backup.json');
 const backup=JSON.parse(fs.readFileSync('test-results/library-backup.json'));assert.equal(backup.files.length,1);
 const other=await browser.newContext();await other.route(/^https?:/,route=>route.abort());const p2=await other.newPage();await p2.goto(pathToFileURL(path.resolve('Folio_Universal.html')).href);await p2.waitForFunction(()=>window.folioMetrics);await p2.locator('#libraryBtn').click();await p2.locator('#backupFile').setInputFiles('test-results/library-backup.json');await p2.waitForFunction(async()=>(await dbRead('meta')).length===1);await p2.locator('.library-open').click();await p2.waitForFunction(()=>documentName==='sample.pdf'&&!opening);
 if(fs.existsSync('test-results/legacy.doc')){await page.locator('#closeLibrary').click();await page.locator('#file').setInputFiles('test-results/legacy.doc');await page.waitForTimeout(1500);console.log('DOC status',await page.evaluate(()=>({documentName,opening,toast:$('toast').textContent})));await page.waitForFunction(()=>documentName==='legacy.doc'&&!opening,{},{timeout:10000});assert(await page.evaluate(()=>data.blocks.some(b=>b.text.trim().length>0)));console.log('DOC text length',await page.evaluate(()=>data.blocks.map(x=>x.text).join('').length));}
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);fs.writeFileSync('test-results/extended.json',JSON.stringify({pdf:true,restore:true,backup:true,offline:true,errors,requests},null,2));await browser.close();console.log('EXTENDED PASS');
})().catch(e=>{console.error(e);process.exit(1)});
