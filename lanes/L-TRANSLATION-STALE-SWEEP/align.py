#!/usr/bin/env python3
"""Corpus-mined word alignment over the 4,782 tri-present keys.

The glossary probe only sees terms I thought to list. This one learns the
lexicon from the dictionary itself: the 4,782 aligned (no, en) and (no, de)
pairs are a small parallel corpus, so Dice co-occurrence gives, for each
Norwegian word, the target words that habitually accompany it.

A Norwegian token in one key is then UNALIGNED when we learned a confident
translation set for it and *none* of that set appears in the target value --
i.e. the Norwegian names something the target never names in this key.

A token we never learned a translation for is UNCOMPARABLE, and is counted,
not silently skipped: that count is the honest denominator.
"""
import json, re, sys, math
from collections import Counter, defaultdict

T = {f: json.load(open('lanes/L-TRANSLATION-STALE-SWEEP/%s.json' % f))['keys']
     for f in ('no', 'en', 'de')}
TRI = sorted(set(T['no']) & set(T['en']) & set(T['de']))

PLACE = re.compile(r'\{[^}]*\}')
WORD  = re.compile(r"[0-9A-Za-zÀ-ÿ]+", re.U)

def toks(s):
    return [w.lower() for w in WORD.findall(PLACE.sub(' ', s))]

MINC  = int(sys.argv[1]) if len(sys.argv) > 1 else 3
THETA = float(sys.argv[2]) if len(sys.argv) > 2 else 0.28

report = {}
for tgt in ('en', 'de'):
    cn, ct, cnt = Counter(), Counter(), Counter()
    pairs = []
    for k in TRI:
        a, b = set(toks(T['no'][k])), set(toks(T[tgt][k]))
        pairs.append((k, a, b))
        cn.update(a); ct.update(b)
        for x in a:
            for y in b:
                cnt[(x, y)] += 1
    lex = defaultdict(set)
    for (x, y), c in cnt.items():
        if cn[x] < MINC or ct[y] < MINC:
            continue
        if 2.0 * c / (cn[x] + ct[y]) >= THETA:
            lex[x].add(y)
    # a Norwegian token that is itself a target vocabulary item (proper nouns,
    # SAF-T, IANA, product names, numerals) is its own translation
    for x in cn:
        if x in ct:
            lex[x].add(x)

    rows, tot_tok, tot_unc, tot_una = [], 0, 0, 0
    for k, a, b in pairs:
        una = sorted(x for x in a if lex.get(x) and not (lex[x] & b))
        unc = sorted(x for x in a if not lex.get(x))
        tot_tok += len(a); tot_unc += len(unc); tot_una += len(una)
        if una:
            rows.append({'key': k, 'unaligned': una, 'uncomparable': unc,
                         'n_no': len(a), 'no': T['no'][k], 'val': T[tgt][k]})
    rows.sort(key=lambda r: (-len(r['unaligned']), r['key']))
    report[tgt] = {'rows': rows, 'lex_size': len(lex),
                   'tot_tok': tot_tok, 'tot_unc': tot_unc, 'tot_una': tot_una,
                   'keys_with_unaligned': len(rows)}
    print('%s: lexicon=%d types | no-tokens=%d | uncomparable=%d (%.1f%%) | '
          'unaligned=%d (%.1f%%) | keys flagged=%d (%.1f%%)'
          % (tgt, len(lex), tot_tok, tot_unc, 100.0*tot_unc/tot_tok,
             tot_una, 100.0*tot_una/tot_tok, len(rows), 100.0*len(rows)/len(TRI)))

json.dump(report, open('lanes/L-TRANSLATION-STALE-SWEEP/align.json', 'w'),
          ensure_ascii=False)

for tgt in ('en', 'de'):
    r = [x for x in report[tgt]['rows'] if x['key'] == 'posset_goods_hint']
    print('known positive posset_goods_hint [%s]:' % tgt,
          (r[0]['unaligned'] if r else 'NOT FLAGGED'),
          ('rank %d/%d' % (report[tgt]['rows'].index(r[0])+1, len(report[tgt]['rows'])) if r else ''))
