#!/usr/bin/env python3
"""Parse a flat `export default { key: 'value', ... }` translations file.

Reads from stdin. Emits JSON {"keys": {k: v}, "unparsed": [[lineno, text], ...],
"dupes": [[k, lineno], ...]}.  Nothing is dropped silently: every line that is
not blank / comment / brace and does not parse is reported.
"""
import sys, json, re

KEYRE = re.compile(r"""^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*""")

def unquote(rest, lineno, unparsed):
    rest = rest.rstrip()
    if rest.endswith(','):
        rest = rest[:-1].rstrip()
    if not rest or rest[0] not in "'\"`":
        return None
    q = rest[0]
    out = []
    i = 1
    while i < len(rest):
        c = rest[i]
        if c == '\\':
            i += 1
            if i >= len(rest):
                return None
            n = rest[i]
            out.append({'n': '\n', 't': '\t', 'r': '\r'}.get(n, n))
        elif c == q:
            if i != len(rest) - 1:
                return None          # trailing junk after the closing quote
            return ''.join(out)
        else:
            out.append(c)
        i += 1
    return None

def parse(text):
    keys, unparsed, dupes = {}, [], []
    for lineno, line in enumerate(text.split('\n'), 1):
        s = line.strip()
        if not s or s.startswith('//') or s.startswith('/*') or s.startswith('*'):
            continue
        if s in ('export default {', '}', '};', '{'):
            continue
        m = KEYRE.match(line)
        if not m:
            unparsed.append([lineno, line])
            continue
        k = m.group(1) or m.group(2) or m.group(3)
        v = unquote(line[m.end():], lineno, unparsed)
        if v is None:
            unparsed.append([lineno, line])
            continue
        if k in keys:
            dupes.append([k, lineno])
        keys[k] = v
    return {'keys': keys, 'unparsed': unparsed, 'dupes': dupes}

print(json.dumps(parse(sys.stdin.read()), ensure_ascii=False))
