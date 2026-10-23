from pathlib import Path
p=Path('universal.js')
s=p.read_text(encoding='utf-8')
s=s.replace('let total=0;while(w.nextNode())','let total=0,nodeIndex=0;while(w.nextNode())')
s=s.replace('a.char=total+offset;','a.char=total+offset;a.nodeIndex=nodeIndex;a.nodeOffset=offset;')
s=s.replace('total+=w.currentNode.length;','total+=w.currentNode.length;nodeIndex++;')
s=s.replace('let n=a.char,w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);','let n=a.char,nodeIndex=-1,w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);')
s=s.replace('if(n<=w.currentNode.length){try{const r=document.createRange();r.setStart(w.currentNode,n);','if(Number.isInteger(a.nodeIndex)?++nodeIndex===a.nodeIndex:n<=w.currentNode.length){try{const r=document.createRange();r.setStart(w.currentNode,Math.min(w.currentNode.length,Number.isInteger(a.nodeIndex)?a.nodeOffset:n));')
p.write_text(s,encoding='utf-8')
