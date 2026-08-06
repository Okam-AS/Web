#!/usr/bin/env python3
import sys, os, json, re, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from derive2 import *

W = '/Users/svendaneel/okam'
LANES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lanes.json')))

TIMES_RE = re.compile(r'<Times[^>]*start="([^"]+)"')

def trx_start(path):
    try:
        with open(path, encoding='utf-8', errors='replace') as fh:
            head = fh.read(4000)
    except Exception:
        return None
    m = TIMES_RE.search(head)
    if not m: return None
    try:
        return datetime.datetime.fromisoformat(m.group(1))
    except Exception:
        return None

def commit_time(sha):
    s = git(['log', '-1', '--format=%cI', sha])
    return datetime.datetime.fromisoformat(s.strip()) if s else None

report = {}
for lane, entries in LANES:
    lane_rec = {'entries': []}
    cache = {}
    for label, sha, trx in entries:
        if sha not in cache:
            cache[sha] = analyse_commit(sha)
        a = cache[sha]
        rec = dict(label=label, sha=sha, repo='OkamAPI', trx=trx,
                   is_merge=a['is_merge'], commit_err=a['err'],
                   claimed=len(a['added']), modified=len(a['modified']),
                   renamed_away=sorted(a['renamed_away']),
                   present=[], missing=[], filtered=[], skipped=[],
                   mod_present=[], mod_missing=[], stale_names=[])
        names, err = trx_read(trx)
        rec['trx_err'] = err
        if names is None:
            rec['trx_total'] = None
            lane_rec['entries'].append(rec); continue
        rec['trx_total'] = len(names)
        base = set(n.split('(')[0] for n in names)
        exact = set(names)
        classes = {}
        nss = {}
        for n in base:
            parts = n.split('.')
            classes[('.'.join(parts[:-1]))] = classes.get('.'.join(parts[:-1]), 0) + 1
            nss['.'.join(parts[:-2])] = nss.get('.'.join(parts[:-2]), 0) + 1

        uni = sqlserver_universe(sha)
        sql_present = len(base & set(uni))
        nonsql_present = len(base) - sql_present
        mode = 'mixed'
        if sql_present == 0: mode = 'non-sql'
        elif nonsql_present == 0: mode = 'sql-only'
        rec['mode'] = mode
        rec['sql_present'] = sql_present
        rec['nonsql_present'] = nonsql_present

        ts, cs_ = trx_start(trx), commit_time(sha)
        rec['trx_start'] = ts.isoformat() if ts else None
        rec['commit_time'] = cs_.isoformat() if cs_ else None
        rec['trx_predates_commit'] = bool(ts and cs_ and ts < cs_)

        def classify(m, bucket_present, bucket_missing):
            fqn = m['fqn']
            cls = '.'.join(fqn.split('.')[:-1])
            ns = '.'.join(fqn.split('.')[:-2])
            item = dict(fqn=fqn, kind=m['kind'], traits=m['traits'],
                        cls_count=classes.get(cls, 0), ns_count=nss.get(ns, 0))
            if fqn in exact:
                item['how'] = 'exact'; bucket_present.append(item); return
            if fqn in base:
                item['how'] = 'theory'; bucket_present.append(item); return
            is_sql = ('Database', 'SqlServer') in m['traits']
            if m['skipped']:
                rec['skipped'].append(item); return
            if is_sql and mode == 'non-sql':
                item['why'] = 'trait Database=SqlServer excluded by non-sql run'
                rec['filtered'].append(item); return
            if (not is_sql) and mode == 'sql-only':
                item['why'] = 'non-SqlServer test excluded by sql-only run'
                rec['filtered'].append(item); return
            bucket_missing.append(item)

        for n, m in sorted(a['added'].items()):
            classify(m, rec['present'], rec['missing'])
        for n, m in sorted(a['modified'].items()):
            classify(m, rec['mod_present'], rec['mod_missing'])
        for old in rec['renamed_away']:
            hits = [n for n in base if n.endswith('.' + old)]
            if hits: rec['stale_names'].extend(hits)
        lane_rec['entries'].append(rec)
    report[lane] = lane_rec

json.dump(report, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report2.json'), 'w'), indent=1)
print('lanes:', len(report))
