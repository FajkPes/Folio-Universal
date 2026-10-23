const {chromium}=require(process.env.FOLIO_PLAYWRIGHT || 'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],report=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve('Folio_Universal.html')).href);await page.waitForFunction(()=>window.folioMetrics);
for(const file of walk('.codex-remote-attachments').filter(x=>/\.(docx|md)$/.test(x))){
 await page.locator('#file').setInputFiles(file);await page.waitForFunction(n=>documentName===n&&!opening,path.basename(file));
 const info=await page.evaluate(()=>({name:documentName,headings:data.toc.length,internal:data.links.filter(l=>l.href.startsWith('#')).length,missing:data.links.filter(l=>l.href.startsWith('#')&&data.aliases[decodeURIComponent(l.href.slice(1))]===undefined).map(l=>({href:l.href,title:l.title})),numbers:data.toc.filter(h=>h.depth<=chapterDepth&&h.number).map(h=>h.number)}));
 assert.deepEqual(info.missing,[],'unresolved internal links in '+info.name);
 const indices=await page.evaluate(()=>Array.from(new Set([3,7,12,18,Math.floor(data.toc.length/2),data.toc.length-2,data.toc.length-8,4])));
 for(const index of indices){
  const target=await page.evaluate(index=>{tab='toc';$('query').value='';filterNav();$('navScroll').scrollTop=index*42;renderNav();return{...data.toc[index]};},index);
  await page.locator('.navrow[data-block="'+target.block+'"]').click();await page.waitForFunction(()=>!jumping);await page.waitForTimeout(180);
  const state=await page.evaluate(i=>({top:active.get(i)?.getBoundingClientRect().top-vp.getBoundingClientRect().top,current:currentHeading()?.block,highlight:[...document.querySelectorAll('.navrow.active')].map(x=>+x.dataset.block),count:document.querySelectorAll('.navrow').length}),target.block);
  assert.equal(state.current,target.block,JSON.stringify({target,state}));assert(state.top>=30&&state.top<55,JSON.stringify({target,state}));assert(state.count<40);
 }
 // Actual hyperlinks in the document, including the supplied invalid Word
 // bookmark names, must resolve to their unique heading labels.
 const links=await page.evaluate(()=>data.links.filter(l=>l.href.startsWith('#')).slice(0,30));
 for(const link of links){
  const expected=await page.evaluate(href=>data.aliases[decodeURIComponent(href.slice(1))],link.href);
  await page.evaluate(i=>jump(i),link.block);const selector='#visible a[href="'+link.href+'"]';await page.locator(selector).first().click();await page.waitForFunction(()=>!jumping);await page.waitForTimeout(50);
  const actual=await page.evaluate(()=>currentHeading()?.block);assert.equal(actual,expected,JSON.stringify({link,actual,expected}));
 }
 report.push(info);console.log(info.name+': headings and '+links.length+' links OK');
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.locator('#menu').click();
await page.evaluate(()=>{tab='toc';$('query').value='';filterNav();$('navScroll').scrollTop=42*7;renderNav();});await page.screenshot({path:'test-results/navigation-mobile.png'});
const overlap=await page.evaluate(()=>{const rows=[...document.querySelectorAll('.navrow')].map(x=>x.getBoundingClientRect()).sort((a,b)=>a.top-b.top);return rows.some((x,i)=>i&&x.top<rows[i-1].bottom-.5);});assert(!overlap);
await page.locator('#menu').click();await page.screenshot({path:'test-results/timeline-mobile.png'});
const labels=await page.evaluate(()=>timelineChapters.filter(x=>x.label).map(x=>x.heading.number));assert(labels.length>8&&labels.every(n=>Number(n)>=1&&Number(n)<=21));
for(const number of [labels[0],labels[Math.floor(labels.length/2)],labels.at(-1)]){const label=await page.evaluate(n=>{const t=timelineChapters.find(x=>x.heading.number===n),r=timeline.getBoundingClientRect();return{x:r.left+(t.label.left+t.label.right)/2,y:r.top+(t.label.top+t.label.bottom)/2,block:t.heading.block};},number);await page.mouse.click(label.x,label.y);await page.waitForFunction(()=>!jumping);assert.equal(await page.evaluate(()=>currentHeading()?.block),label.block);}
assert.deepEqual(errors,[]);fs.writeFileSync('test-results/navigation.json',JSON.stringify({report,errors},null,2));await browser.close();console.log('NAVIGATION PASS');
})().catch(e=>{console.error(e);process.exit(1)});
