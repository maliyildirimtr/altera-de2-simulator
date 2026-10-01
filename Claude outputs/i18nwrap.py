import re, sys, json, os

src = open('src/i18n/toolText.ts').read()
body = src[src.index('export const TOOL_TR'):src.index('};', src.index('export const TOOL_TR'))]
keys = set()
for m in re.finditer(r"^\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"|(\w+)):", body, re.M):
    k = m.group(1) or m.group(2) or m.group(3)
    keys.add(k.replace("\\'", "'"))

def js(s):
    return json.dumps(s, ensure_ascii=False)

changed_files = []
for path in sys.argv[1:]:
    s = open(path).read()
    orig = s
    count = 0

    def text_node(m):
        global count
        lead, text, trail = m.group(1), m.group(2), m.group(3)
        key = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        if key in keys:
            return '>' + lead + '{t(' + js(key) + ')}' + trail + '<'
        return m.group(0)
    s = re.sub(r'>(\s*)([^<>{}\n]*[A-Za-z]{2,}[^<>{}\n]*?)(\s*)<', text_node, s)

    def attr(m):
        name, val = m.group(1), m.group(2)
        if val in keys:
            return name + '={t(' + js(val) + ')}'
        return m.group(0)
    s = re.sub(r'\b(title|aria-label|placeholder)="([^"]+)"', attr, s)

    def ternary(m):
        a, b = m.group(1), m.group(2)
        if a not in keys and b not in keys:
            return m.group(0)
        ra = 't(' + js(a) + ')' if a in keys else "'" + a + "'"
        rb = 't(' + js(b) + ')' if b in keys else "'" + b + "'"
        return '? ' + ra + ' : ' + rb
    s = re.sub(r"\?\s*'([^'\n]+)'\s*:\s*'([^'\n]+)'", ternary, s)

    if s == orig:
        continue

    if 'useT()' in orig:
        open(path, 'w').write(s)
        changed_files.append(path)
        continue
    # Hook into every component-looking function.
    lines = s.split('\n')
    out = []
    comp_re = re.compile(r'^(export\s+)?(default\s+)?(const\s+[A-Z]\w*\s*(:\s*React\.FC[^=]*)?=\s*(React\.memo\()?\s*\([^)]*\)\s*(:\s*[\w.<>\[\] |]+)?\s*=>\s*\{\s*$|function\s+[A-Z]\w*\s*\(.*\)\s*(:\s*[\w.<>\[\] |]+)?\s*\{\s*$)')
    i = 0
    pending_multiline = False
    for idx, line in enumerate(lines):
        out.append(line)
        stripped = line.strip()
        if comp_re.match(stripped):
            out.append('  const t = useT();')
        elif re.match(r'^(export\s+)?(default\s+)?(const\s+[A-Z]\w*\s*(:\s*React\.FC[^=]*)?=\s*(React\.memo\()?\s*\(\s*\{?|function\s+[A-Z]\w*\s*\()\s*$', stripped):
            pending_multiline = True
        elif pending_multiline and re.match(r'^\}?\)?(\s*:\s*[\w.<>\[\] |{};,]+)?\s*(=>\s*)?\{\s*$', stripped) or (pending_multiline and re.match(r'^\}\s*(:\s*[^=]+)?\)\s*(=>)?\s*\{\s*$', stripped)):
            out.append('  const t = useT();')
            pending_multiline = False
    s = '\n'.join(out)

    rel = os.path.relpath('src/i18n/toolText', os.path.dirname(path))
    if not rel.startswith('.'):
        rel = './' + rel
    imp = "import { useT } from '" + rel + "';\n"
    # after the last import statement
    last = [m.end() for m in re.finditer(r"^import[^;]*;\s*$", s, re.M)]
    pos = last[-1] + 1 if last else 0
    s = s[:pos] + imp + s[pos:]
    open(path, 'w').write(s)
    changed_files.append(path)

print('\n'.join(changed_files))
