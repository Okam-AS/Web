#!/usr/bin/env python3
"""Drop closed-class positional tokens from the aligner's output.

Prepositions, pronouns, articles, copulas and conjunctions do not map 1:1
between Norwegian, English and German, so an unaligned one carries no
information. NEGATION, MODALITY and QUANTIFIERS are deliberately NOT dropped
-- ikke / aldri / bare / kun / alltid / må / kan / ingen / alle are exactly
where a control's meaning lives -- and neither is any word not in this list.
"""
import json
from collections import Counter

STOP = set("""
og i pa på til av er en et ei den det de som for med om at a å
du vi dere jeg meg deg oss seg han hun ham henne dem sin sitt sine
din ditt dine min mitt mine var vart vare vår vårt våre
her der hit dit na nå da så nar når hva hvem hvor hvordan hvis
men eller for fordi siden mens enn ut inn opp ned over under ved
fra etter for før mot mellom hos gjennom rundt langs uten hele
blir ble bli vaere være vart vært har hadde ha skal skulle vil ville
denne dette disse hver hvert man ens noe annet annen andre
seg selv igjen ogsa også bade både samme slik sann sånn
""".split())

# words that LOOK closed-class but carry the meaning this lane is hunting
KEEP = set('ikke aldri bare kun alltid ma må kan ingen alle ma kreves ei'.split())
STOP -= KEEP

R = json.load(open('lanes/L-TRANSLATION-STALE-SWEEP/align.json'))
out = {}
for tgt in ('en', 'de'):
    rows = []
    for r in R[tgt]['rows']:
        u = [t for t in r['unaligned'] if t not in STOP]
        if u:
            rows.append(dict(r, unaligned=u))
    rows.sort(key=lambda r: (-len(r['unaligned']), r['key']))
    out[tgt] = rows
    c = Counter(t for r in rows for t in r['unaligned'])
    print('%s: %d keys survive (from %d) | %d content tokens, %d distinct'
          % (tgt, len(rows), len(R[tgt]['rows']), sum(c.values()), len(c)))
json.dump(out, open('lanes/L-TRANSLATION-STALE-SWEEP/filtered.json', 'w'),
          ensure_ascii=False)
for tgt in ('en', 'de'):
    hit = [r for r in out[tgt] if r['key'] == 'posset_goods_hint']
    print('known positive [%s]:' % tgt, hit[0]['unaligned'] if hit else 'LOST')
print('union of flagged keys:', len({r['key'] for t in out for r in out[t]}))
