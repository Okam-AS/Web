#!/usr/bin/env python3
"""v2: derive whether a cited trx contains the tests its commit adds/renames/modifies."""
import re, subprocess, html, functools

REPO = '/Users/svendaneel/okam/OkamAPI'

def git(args, repo=REPO):
    p = subprocess.run(['git', '-C', repo] + args, capture_output=True)
    if p.returncode != 0:
        return None
    return p.stdout.decode('utf-8', 'replace')

METHOD_RE = re.compile(r'^\s*(?:public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?(?:Task|void|Task<[^>]*>)\s+([A-Za-z_]\w*)\s*\(')
CLASS_RE  = re.compile(r'^\s*(?:(?:public|internal|abstract|sealed|partial|static)\s+)*class\s+([A-Za-z_]\w*)')
NS_RE     = re.compile(r'^\s*namespace\s+([A-Za-z_][\w.]*)')
FACT_RE   = re.compile(r'\[\s*(Fact|Theory)\b')
TRAIT_RE  = re.compile(r'\[\s*Trait\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)\s*\]')
SKIP_RE   = re.compile(r'\[\s*(?:Fact|Theory)\s*\([^)]*Skip\s*=')

def parse_file(text):
    """method_name -> meta incl. decl line number (1-based)."""
    ns, cur_class, pending, class_traits, out = '', None, [], {}, {}
    for i, ln in enumerate(text.split('\n'), 1):
        m = NS_RE.match(ln)
        if m:
            ns = m.group(1); continue
        s = ln.strip()
        if s.startswith('['):
            pending.append(ln); continue
        mc = CLASS_RE.match(ln)
        if mc:
            cur_class = mc.group(1)
            class_traits[cur_class] = TRAIT_RE.findall(' '.join(pending))
            pending = []; continue
        mm = METHOD_RE.match(ln)
        if mm:
            attrs = ' '.join(pending)
            fm = FACT_RE.search(attrs)
            if fm and cur_class:
                n = mm.group(1)
                out[n] = dict(cls=cur_class, ns=ns,
                              fqn=(ns + '.' if ns else '') + cur_class + '.' + n,
                              kind=fm.group(1), line=i,
                              traits=TRAIT_RE.findall(attrs) + class_traits.get(cur_class, []),
                              skipped=bool(SKIP_RE.search(attrs)))
            pending = []; continue
        if s and not s.startswith('//') and not s.startswith('///'):
            pending = []
    return out

HUNK_RE = re.compile(r'^@@ -\S+ \+(\d+)(?:,(\d+))? @@')

def analyse_commit(sha):
    """-> dict(added, renamed_away, modified, files, is_merge, err)"""
    parents = (git(['rev-list', '--parents', '-n1', sha]) or '').split()
    if not parents:
        return dict(err='no such commit', added={}, renamed_away={}, modified={}, files=[], is_merge=False)
    is_merge = len(parents) > 2
    base = parents[1] if len(parents) > 1 else None
    diff_args = ['diff', '--unified=0', '-M', f'{base}', sha] if base else ['show', '--pretty=format:', '--unified=0', '-M', sha]
    names = git(['diff', '--name-only', f'{base}', sha] if base else ['show', '--pretty=format:', '--name-only', sha]) or ''
    cs = [f for f in names.strip().split('\n') if f.endswith('.cs') and 'Tests' in f]
    if not cs:
        return dict(err=None, added={}, renamed_away={}, modified={}, files=[], is_merge=is_merge)
    diff = git(diff_args + ['--'] + cs) or ''

    post = {}
    for f in cs:
        c = git(['show', f'{sha}:{f}'])
        if c is None:
            continue
        for n, m in parse_file(c).items():
            m['file'] = f
            post.setdefault(n, m)

    added_decl, removed_decl, touched_lines = set(), set(), {}
    cur_file, cur_new_line = None, 0
    for ln in diff.split('\n'):
        if ln.startswith('+++ b/'):
            cur_file = ln[6:]; continue
        h = HUNK_RE.match(ln)
        if h:
            cur_new_line = int(h.group(1)); continue
        if ln.startswith('+') and not ln.startswith('+++'):
            body = ln[1:]
            m = METHOD_RE.match(body)
            if m: added_decl.add(m.group(1))
            touched_lines.setdefault(cur_file, []).append(cur_new_line)
            cur_new_line += 1
        elif ln.startswith('-') and not ln.startswith('---'):
            m = METHOD_RE.match(ln[1:])
            if m: removed_decl.add(m.group(1))

    added = {n: post[n] for n in added_decl if n in post}

    # methods whose body was touched but whose declaration was not added
    by_file = {}
    for n, m in post.items():
        by_file.setdefault(m['file'], []).append((m['line'], n))
    for v in by_file.values():
        v.sort()
    modified = {}
    for f, lines in touched_lines.items():
        spans = by_file.get(f, [])
        if not spans:
            continue
        for L in set(lines):
            prev = None
            for (dl, n) in spans:
                if dl <= L: prev = n
                else: break
            if prev and prev not in added_decl:
                modified[prev] = post[prev]

    renamed_away = {n: None for n in removed_decl if n not in post}
    return dict(err=None, added=added, renamed_away=renamed_away, modified=modified,
                files=cs, is_merge=is_merge)

TRXNAME_RE = re.compile(r'testName="([^"]*)"')
OUTCOME_RE = re.compile(r'testName="([^"]*)"[^>]*?outcome="([^"]*)"')

def trx_read(path):
    try:
        data = open(path, encoding='utf-8', errors='replace').read()
    except Exception as e:
        return None, f'UNREADABLE: {e}'
    if not data.strip():
        return None, 'EMPTY'
    names = [html.unescape(n) for n in TRXNAME_RE.findall(data)]
    err = None if '</TestRun>' in data else 'TRUNCATED'
    return names, err

@functools.lru_cache(maxsize=32)
def sqlserver_universe(sha):
    """FQNs of tests carrying Trait("Database","SqlServer") at this commit."""
    out = git(['grep', '-l', '-e', 'Trait("Database", "SqlServer")', '-e', 'Trait("Database","SqlServer")',
               sha, '--', 'WebApi.Tests'])
    fqns = set()
    if not out:
        return fqns
    for line in out.strip().split('\n'):
        f = line.split(':', 1)[1] if ':' in line else line
        c = git(['show', f'{sha}:{f}'])
        if not c: continue
        for n, m in parse_file(c).items():
            if ('Database', 'SqlServer') in m['traits']:
                fqns.add(m['fqn'])
    return frozenset(fqns)
