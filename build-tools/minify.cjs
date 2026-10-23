const fs=require('fs');const {minify}=require('terser');
(async()=>{for(const f of ['doc.browser.js','mammoth.browser.js','pdf.mjs','pdf.worker.mjs']){const r=await minify(fs.readFileSync('vendor/'+f,'utf8'),{module:f.endsWith('.mjs'),compress:true,mangle:true,format:{comments:/@license|@licstart|Copyright|License/}});fs.writeFileSync('vendor/'+f+'.min',r.code);console.log(f,r.code.length);}})();
