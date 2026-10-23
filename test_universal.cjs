const {chromium}=require(process.env.FOLIO_PLAYWRIGHT || 'playwright');
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const assert=require('assert');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('Folio_Universal.html')).href);
 await page.waitForFunction(()=>window.folioMetrics);
 const results=[];
 const files=walk('.codex-remote-attachments').filter(x=>/\.(md|docx)$/.test(x));
 for(const file of files){
   await page.locator('#file').setInputFiles(file);
   await page.waitForFunction(name=>document.getElementById('filename').textContent===name&&!document.body.classList.contains('loading'),path.basename(file),{timeout:90000});
   const info=await page.evaluate(()=>({name:documentName,blocks:data.blocks.length,headings:data.toc.length,types:data.toc.reduce((a,x)=>(a[x.depth]=(a[x.depth]||0)+1,a),{}),rendered:active.size,firstTitles:data.toc.slice(0,5).map(x=>x.title),text:data.blocks.map(x=>x.text).join(' ').length}));
   assert(info.headings>50);assert(info.rendered<100);
   await page.screenshot({path:'test-results/'+path.basename(file)+'.png'});
   await page.evaluate(async()=>{await jump(Math.floor(data.blocks.length*.6));});
   await page.waitForTimeout(350);
   const before=await page.evaluate(()=>getAnchor());
   await page.evaluate(()=>setReadFullscreen(true));await page.waitForTimeout(250);
   await page.evaluate(()=>setReadFullscreen(false));await page.waitForTimeout(350);
   const after=await page.evaluate(()=>getAnchor());
   info.fullscreen={before,after};assert(Math.abs(after.block-before.block)<=1);if(before.char===after.char&&Number.isFinite(before.screen))assert(Math.abs(before.screen-after.screen)<2);
   const probe=await page.evaluate(()=>data.toc[Math.floor(data.toc.length*.8)].title.slice(0,18));
   await page.locator('[data-tab=search]').click();await page.locator('#query').fill(probe);await page.waitForTimeout(450);
   assert(await page.locator('.navrow').count()>0);
   await page.locator('[data-tab=toc]').click();
   results.push(info);console.log(JSON.stringify(info));
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 const mobileBefore=await page.evaluate(()=>getAnchor());await page.evaluate(()=>setReadFullscreen(true));await page.evaluate(()=>setReadFullscreen(false));await page.waitForTimeout(250);const mobileAfter=await page.evaluate(()=>getAnchor());assert(Math.abs(mobileBefore.block-mobileAfter.block)<=1);
 await page.screenshot({path:'test-results/mobile-reader.png'});
 await page.locator('#menu').click();await page.screenshot({path:'test-results/mobile-chapters.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#menu').click();
 // Literal text must not become Markdown or execute HTML.
 await page.locator('#file').setInputFiles({name:'literal.txt',mimeType:'text/plain',buffer:Buffer.from('# No heading\n<script>alert(1)</script>\n  indentation\n')});
 await page.waitForFunction(()=>documentName==='literal.txt'&&!opening);
 assert.equal(await page.evaluate(()=>data.toc.length),0);
 assert((await page.locator('#visible').innerText()).includes('<script>'));
 // 10-document LRU capacity, 4 protected entries, and unchanged-content reuse.
 await page.evaluate(async()=>{for(let n=0;n<4;n++)await dbWrite(['meta'],tx=>{let s=tx.objectStore('meta'),r=s.getAll();r.onsuccess=()=>{let x=r.result[n];s.put({...x,pinned:true});};});});
 const pins=await page.evaluate(async()=>(await dbRead('meta')).filter(x=>x.pinned).map(x=>x.name));
 await page.evaluate(async()=>{for(let n=0;n<9;n++){const file=new File(['text '+n],'extra-'+n+'.txt');await rememberFile(file,await file.arrayBuffer());}});
 const records=await page.evaluate(()=>dbRead('meta'));assert.equal(records.length,10);assert(pins.every(p=>records.some(r=>r.name===p)));
 const same=await page.evaluate(async()=>{let f=new File(['same '.repeat(1000)],'same.txt');await rememberFile(f,await f.arrayBuffer());const before=await dbRead('files',f.name);await dbWrite(['files'],tx=>tx.objectStore('files').put({...before,testSentinel:42}));await rememberFile(f,await f.arrayBuffer());const after=await dbRead('files',f.name);return{equal:before.hash===after.hash,compressed:after.blob.size<f.size,notRewritten:after.testSentinel===42};});assert(same.equal&&same.compressed&&same.notRewritten);
 const changed=await page.evaluate(async()=>{let f=new File(['changed'],'same.txt');await rememberFile(f,await f.arrayBuffer());return await(await unpack(await dbRead('files','same.txt'))).text();});assert.equal(changed,'changed');
 // Long document: bounded DOM and folded timeline updates.
 const long='# Title\n\n'+Array.from({length:2500},(_,i)=>'## Chapter '+i+'\n\n'+('Long paragraph '+i+' ').repeat(25)+'\n\n### Detail '+i+'\n\nMore text.\n\n').join('');
 await page.locator('#file').setInputFiles({name:'long.md',mimeType:'text/markdown',buffer:Buffer.from(long)});
 await page.waitForFunction(()=>documentName==='long.md'&&!opening,{},{timeout:90000});
 const longInfo=await page.evaluate(()=>({blocks:data.blocks.length,headings:data.toc.length,dom:active.size,ms:window.folioMetrics.parseMs}));assert(longInfo.headings===5001);assert(longInfo.dom<100);results.push({long:longInfo});
 await page.evaluate(()=>{rulesText='Chapter 4';foldEnabled=true;buildGroups();clearBlocks();initHeights();spacers();render();});
 const collapsed=await page.evaluate(()=>sum(heights.length));await page.evaluate(()=>changeFolds(()=>foldGroups.forEach(x=>x.open=true)));await page.waitForTimeout(300);const expanded=await page.evaluate(()=>sum(heights.length));assert(expanded>collapsed);
 assert.deepEqual(errors,[]);
 fs.writeFileSync('test-results/results.json',JSON.stringify({results,errors},null,2));
 await browser.close();console.log('PASS');
})().catch(e=>{console.error(e);process.exit(1)});
