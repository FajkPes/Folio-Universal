const fs=require('fs');
const {minify}=require('terser');
(async()=>{
 const result=await minify(fs.readFileSync(0,'utf8'),{compress:{passes:2},mangle:true,format:{comments:false}});
 process.stdout.write(result.code);
})().catch(error=>{console.error(error);process.exit(1)});
