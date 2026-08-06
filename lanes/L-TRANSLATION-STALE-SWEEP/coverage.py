#!/usr/bin/env python3
"""Per-key comparability: what fraction of each Norwegian value the aligner
actually had a learned translation for. A key whose content tokens are mostly
UNCOMPARABLE was not compared -- it was skipped, and it is counted here."""
import json, re
from collections import Counter
R = json.load(open('lanes/L-TRANSLATION-STALE-SWEEP/align.json'))
T = {f: json.load(open('lanes/L-TRANSLATION-STALE-SWEEP/%s.json' % f))['keys']
     for f in ('no','en','de')}
TRI = sorted(set(T['no']) & set(T['en']) & set(T['de']))
# align.json only stores rows that HAD an unaligned token; recompute per-key
# comparability from the same lexicon by re-running the counter here.
exec(open('lanes/L-TRANSLATION-STALE-SWEEP/align.py').read().split("report = {}")[0]
     .replace("MINC  = int(sys.argv[1]) if len(sys.argv) > 1 else 3","MINC=3")
     .replace("THETA = float(sys.argv[2]) if len(sys.argv) > 2 else 0.28","THETA=0.07"))
from collections import defaultdict
STOPSRC = open('lanes/L-TRANSLATION-STALE-SWEEP/filter.py').read()
ns = {}
exec(STOPSRC.split('R = json.load')[0], ns)
STOP = ns['STOP']
summary = {}
for tgt in ('en','de'):
    cn, ct, cnt = Counter(), Counter(), Counter()
    pairs = []
    for k in TRI:
        a, b = set(toks(T['no'][k])), set(toks(T[tgt][k]))
        pairs.append((k,a,b)); cn.update(a); ct.update(b)
        for x in a:
            for y in b: cnt[(x,y)] += 1
    lex = defaultdict(set)
    for (x,y),c in cnt.items():
        if cn[x]>=3 and ct[y]>=3 and 2.0*c/(cn[x]+ct[y])>=0.07: lex[x].add(y)
    for x in cn:
        if x in ct: lex[x].add(x)
    full=part=none=empty=0
    for k,a,b in pairs:
        content=[x for x in a if x not in STOP]
        if not content: empty+=1; continue
        cov=sum(1 for x in content if lex.get(x))/len(content)
        if cov==1.0: full+=1
        elif cov==0.0: none+=1
        else: part+=1
    summary[tgt]=dict(full=full,part=part,none=none,empty=empty)
    print('%s: fully comparable %d | partly %d | no content token comparable %d | '
          'no content tokens at all %d  (of %d)' % (tgt,full,part,none,empty,len(TRI)))
json.dump(summary, open('lanes/L-TRANSLATION-STALE-SWEEP/coverage.json','w'))
