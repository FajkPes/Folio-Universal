// Shared navigation for Markdown, converted Word, and PDF page headings.
const chapterNumber=title=>title.match(/^\s*(\d+(?:\.\d+)*|[IVXLCDM]+)[.)]\s+/)?.[1]||'';
const titleKey=title=>title.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/^\s*(?:\d+(?:\.\d+)*|[ivxlcdm]+)[.)]\s+/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
let navigationVersion=0,navRows=new Map(),jumpSerial=0,selectedJump=null,timelineChapters=[];
let timelineNumbersMode='above';try{if(localStorage.getItem('folio.timelineNumbersMode')==='inside')timelineNumbersMode='inside';}catch{}
const timelineSetting=document.createElement('div');timelineSetting.className='setting-row';timelineSetting.innerHTML='<label for="timelineNumbersMode">Čísla kapitol na časové ose</label><select id="timelineNumbersMode"><option value="above">Těsně nad tenkou osou</option><option value="inside">Uvnitř časové osy</option></select>';
$('settings').insertBefore(timelineSetting,$('settings').querySelector('h3'));$('timelineNumbersMode').value=timelineNumbersMode;document.body.classList.toggle('timeline-inside',timelineNumbersMode==='inside');
$('timelineNumbersMode').onchange=()=>{timelineNumbersMode=$('timelineNumbersMode').value;document.body.classList.toggle('timeline-inside',timelineNumbersMode==='inside');try{localStorage.setItem('folio.timelineNumbersMode',timelineNumbersMode);}catch{storageNotice();}tickKey='';updateTimeline();};
function prepareNavigation(){
 data.aliases=Object.assign(Object.create(null),data.aliases);const byTitle=new Map(),candidates=new Map();
 // Markdown can contain a standalone, invisible bookmark before a heading.
 // Land on its following content instead of the empty spacer block.
 for(const [id,index]of Object.entries(data.aliases)){const block=data.blocks[index];if(block&&!block.text.trim()&&/<a\b[^>]*\bid\s*=/i.test(block.html)&&!/<(?:img|hr|br|table|input)\b/i.test(block.html)){let next=index+1;while(next<data.blocks.length&&!data.blocks[next].text.trim())next++;if(next<data.blocks.length)data.aliases[id]=next;}}
 const offer=(key,block)=>{if(!key)return;const previous=candidates.get(key);if(previous===undefined)candidates.set(key,block);else if(previous!==block)candidates.set(key,null);};
 for(const h of data.toc){h.number=chapterNumber(h.title);const key=titleKey(h.title);if(!byTitle.has(key))byTitle.set(key,[]);byTitle.get(key).push(h);offer(h.id?.toLowerCase(),h.block);offer(key.replace(/ /g,'-'),h.block);}
 for(const [key,block]of candidates)if(block!==null&&!Object.hasOwn(data.aliases,key))data.aliases[key]=block;
 for(const link of data.links){if(!link.href?.startsWith('#'))continue;let id;try{id=decodeURIComponent(link.href.slice(1));}catch{id=link.href.slice(1);}if(Object.hasOwn(data.aliases,id))continue;const matches=byTitle.get(titleKey(link.title));if(matches?.length===1)offer(id,matches[0].block);}
 for(const [key,block]of candidates)if(block!==null&&!Object.hasOwn(data.aliases,key))data.aliases[key]=block;
 navigationVersion++;navRows.clear();$('navInner').replaceChildren();selectedJump=null;tickKey='';
}
function currentHeading(){
 if(selectedJump!==null)return data.toc.find(h=>h.block===selectedJump)||null;
 const y=Math.max(0,vp.scrollTop-$('paper').offsetTop-parseFloat(getComputedStyle($('paper')).paddingTop)+52),block=indexAt(y);
 let lo=0,hi=data.toc.length;while(lo<hi){const mid=(lo+hi)>>1;if(data.toc[mid].block<=block)lo=mid+1;else hi=mid;}return data.toc[lo-1]||null;
}
function renderNav(){
 const sc=$('navScroll'),start=Math.max(0,Math.floor(sc.scrollTop/42)-4),end=Math.min(navItems.length,start+Math.ceil(sc.clientHeight/42)+8),current=currentHeading();followCurrentChapter(current);
 $('crumb').textContent=current?.title||'Začátek dokumentu';
 const keep=new Set();for(let i=start;i<end;i++){
  const item=navItems[i],key=navigationVersion+':'+tab+':'+i;keep.add(key);let row=navRows.get(key);
  if(!row){const button=document.createElement('button');button.type='button';row={button,item:null};navRows.set(key,row);$('navInner').append(button);button.onclick=()=>{const target=row.item;if(tab==='links'&&target.href?.startsWith('#'))anchor(target.href);else jump(target.block,target.id);};}
  const b=row.button,main=tab==='toc'&&item.depth<=chapterDepth;
  if(row.item!==item){row.item=item;b.replaceChildren();const label=document.createElement('span');label.className='nav-title';label.textContent=displayHeading(item.title,item.depth);b.append(label);if(tab==='toc'&&item.depth>chapterDepth)addNavRails(b,{depth:3});b.title=item.title;b.dataset.block=item.block;}
  b.className='navrow'+(item.block===current?.block?' active':'')+(main?' major':tab==='toc'?' child':'');b.style.top=i*42+'px';b.style.paddingLeft=12+(tab==='toc'?Math.max(0,Math.min(4,item.depth-chapterDepth))*15:0)+'px';b.setAttribute('aria-current',item.block===current?.block?'location':'false');
 }
 for(const [key,row]of navRows)if(!keep.has(key)){row.button.remove();navRows.delete(key);}
}
async function jump(i,id){
 if(!Number.isInteger(i)||i<0||i>=data.blocks.length)return notify('Cíl odkazu se nepodařilo jednoznačně najít.');
 const serial=++jumpSerial;setNav(false);readingTouched=true;fullscreenReturnAnchor=null;revealBlock(i);jumping=true;selectedJump=i;
 try{
  // First materialize the destination using current height estimates. Then keep
  // aligning its actual DOM position while ResizeObserver measures its neighbours.
  spacers();vp.scrollTop=sum(i)+$('paper').offsetTop+parseFloat(getComputedStyle($('paper')).paddingTop);render();
  for(let pass=0;pass<8;pass++){
   await nextPaint();if(serial!==jumpSerial)return;let block=active.get(i);
   if(!block){vp.scrollTop=sum(i)+$('paper').offsetTop+parseFloat(getComputedStyle($('paper')).paddingTop);render();continue;}
   const target=id?[...block.querySelectorAll('[data-anchor],[data-anchor-name]')].find(el=>el.dataset.anchor===id||el.dataset.anchorName===id)||block:block;
   const delta=target.getBoundingClientRect().top-vp.getBoundingClientRect().top-44;
   if(Math.abs(delta)>.5)vp.scrollTop+=delta;render();
  }
  const block=active.get(i);if(block)flashTarget(block);stableAnchor=getAnchor();
 }finally{if(serial===jumpSerial){jumping=false;selectedJump=null;renderNav();queueReadingSave();}}
}
for(const type of ['wheel','touchstart','pointerdown','keydown'])vp.addEventListener(type,()=>{if(jumping){jumpSerial++;jumping=false;selectedJump=null;}},{passive:true});
function updateTimeline(){
 ensureAxis();const ratio=axisRatio({...getAnchor(),end:vp.scrollTop>0&&vp.scrollTop+vp.clientHeight>=vp.scrollHeight-2});$('progress').style.width=ratio*100+'%';$('position').textContent=Math.round(ratio*100)+' %';$('timelineBadge').textContent=Math.round(ratio*100)+' %';$('timeline').setAttribute('aria-valuenow',Math.round(ratio*100));updateBookmark();
 const canvas=$('chapterTicks'),width=canvas.clientWidth,height=canvas.clientHeight,ink=getComputedStyle(document.body).getPropertyValue('--ink'),key=[width,height,axisSignature,pdfEpoch,navigationVersion,timelineNumbersMode,ink].join(':');if(key===tickKey)return;tickKey=key;
 canvas.width=Math.round(width*devicePixelRatio);canvas.height=Math.round(height*devicePixelRatio);const c=canvas.getContext('2d');c.scale(devicePixelRatio,devicePixelRatio);c.font='10px system-ui';c.textBaseline='top';c.fillStyle=ink;
 timelineChapters=[];let labelRight=-1;
 for(const h of data.toc){if(h.depth>chapterDepth||hiddenBlocks[h.block])continue;const x=Math.min(width-1,axisPositions[h.block]/axisTotal*width);
  c.fillRect(Math.round(x),height-5,1,5);const item={x,heading:h};timelineChapters.push(item);if(!h.number)continue;const size=c.measureText(h.number).width,labelX=Math.min(width-size-2,x+2);
  if(labelX>labelRight+2&&!(labelX<width/2+24&&labelX+size>width/2-24)){const y=timelineNumbersMode==='inside'?3:0;c.fillText(h.number,labelX,y);labelRight=labelX+size;item.label={left:labelX,right:labelX+size,top:y,bottom:y+11};}
 }
}
function nearestChapter(x){let nearest=null,distance=Infinity;for(const item of timelineChapters){const d=Math.abs(item.x-x);if(d<distance){nearest=item;distance=d;}}return{item:nearest,distance};}
timeline.onpointermove=e=>{if(timeline.hasPointerCapture(e.pointerId)){seek(e);return;}const {item}=nearestChapter(e.clientX-timeline.getBoundingClientRect().left);timeline.title=item?item.heading.title+' · klikni na značku kapitoly':'';};
timeline.onpointerdown=e=>{const rect=timeline.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,label=timelineChapters.find(item=>item.label&&x>=item.label.left-1&&x<=item.label.right+1&&y>=item.label.top&&y<item.label.bottom);const {item,distance}=nearestChapter(x);const target=label||(distance<6?item:null);if(target){jump(target.heading.block,target.heading.id);return;}timeline.setPointerCapture(e.pointerId);seek(e);};
