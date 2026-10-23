from pathlib import Path
import re,json
packages=set()
for line in Path('build-tools/doc-modules.txt').read_text(encoding='utf-8-sig').splitlines():
    p=Path(line.strip()).parent
    while p!=p.parent:
        if (p/'package.json').exists():
            packages.add(p.resolve())
            break
        p=p.parent
def visit(p):
    p=p.resolve()
    if p in packages:return
    packages.add(p)
    info=json.loads((p/'package.json').read_text(encoding='utf-8'))
    for name in info.get('dependencies',{}):
        at=p
        while at!=at.parent:
            candidate=at/'node_modules'/name
            if (candidate/'package.json').exists():
                visit(candidate)
                break
            at=at.parent
visit(Path('build-tools/node_modules/mammoth'))
parts=[];seen=set()
for p in sorted(packages):
    for f in p.iterdir():
        if f.is_file() and re.match(r'^(license|licence|copying)',f.name,re.I):
            text=f.read_text(encoding='utf-8',errors='replace')
            if text not in seen:
                parts.append(p.name+'\n'+text)
                seen.add(text)
Path('vendor/DEPENDENCY-LICENSES').write_text('\n\n'.join(parts),encoding='utf-8')
print('Dependency license notices:',len(parts))
