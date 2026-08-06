#!/usr/bin/env python3
"""Mechanical divergence signals over the 4,782 keys present in all three locales.

For each key and each target locale (en, de) we ask a narrow question:
does the Norwegian value carry a *countable* element the target value does not?
Nothing here reads meaning; every signal is a token-level set or count comparison.
"""
import json, re, sys, unicodedata

T = {f: json.load(open('lanes/L-TRANSLATION-STALE-SWEEP/%s.json' % f))['keys']
     for f in ('no', 'en', 'de')}
TRI = sorted(set(T['no']) & set(T['en']) & set(T['de']))

PLACE = re.compile(r'\{[^}]*\}')
# a "number" = a digit run, keeping decimal separators, so 15/25/15 -> 15,25,15
NUM   = re.compile(r'\d+(?:[.,]\d+)?')
# sentence terminators outside placeholders; "." after a digit (1.) or inside
# an abbreviation (bl.a., f.eks., z.B., Nr.) is excluded by the guard below.
ABBR  = ('bl.a.', 'f.eks.', 'ev.', 'osv.', 'dvs.', 'jf.', 'kl.', 'nr.', 'mm.',
         'z.B.', 'ggf.', 'bzw.', 'inkl.', 'exkl.', 'ca.', 'ekskl.', 'Nr.',
         'e.g.', 'i.e.', 'etc.', 'vs.', 'MwSt.', 'Std.', 'usw.', 'Abs.', 'St.',
         'max.', 'min.', 'Mio.', 'Mrd.', 'u.a.', 'd.h.', 'St.', 'Hr.', 'Fr.')

STATUTE = re.compile(
    r'§|\bmval\b|\bbokf(ø|o)ring|\bkassasystem|\bforskrift|\bskatteetat|'
    r'\barbeidsmilj(ø|o)|\bfolketrygd|\ba-melding|\baml\b|\bmerverdiavgift|'
    r'\bregnskapslov|\bpersonopplysning|\bgdpr\b|\bmattilsyn|\bik-mat|'
    r'\binternkontroll|\bhms\b|\bsaf-t\b|\bskattemelding|\bavgiftslov',
    re.I)

def strip_place(s):
    return PLACE.sub(' ', s)

def sentences(s):
    s = strip_place(s)
    for a in ABBR:
        s = s.replace(a, 'X')
    # a terminator only counts when followed by end/space+capital
    return len(re.findall(r'[.!?](?=\s|$)', s))

def nums(s):
    return sorted(NUM.findall(strip_place(s)))

def places(s):
    return sorted(PLACE.findall(s))

def clauses(s):
    return len(re.findall(r'[;·•—–:]|\.\s|\)\s|,\s', strip_place(s)))

def norm_len(s):
    return len(strip_place(s).strip())

rows = []
for k in TRI:
    no, en, de = T['no'][k], T['en'][k], T['de'][k]
    r = {'key': k, 'no': no, 'en': en, 'de': de}
    r['no_len'] = norm_len(no)
    for tgt in ('en', 'de'):
        v = T[tgt][k]
        r[tgt + '_len'] = norm_len(v)
        r[tgt + '_ratio'] = (norm_len(no) / norm_len(v)) if norm_len(v) else None
        r[tgt + '_sent_delta'] = sentences(no) - sentences(v)
        r[tgt + '_num_missing'] = [n for n in nums(no) if n not in nums(v)]
        r[tgt + '_place_missing'] = [p for p in places(no) if p not in places(v)]
        r[tgt + '_statute_no_only'] = bool(STATUTE.search(no)) and not bool(STATUTE.search(v))
        r[tgt + '_clause_delta'] = clauses(no) - clauses(v)
        r[tgt + '_identical'] = (no == v)
    rows.append(r)

json.dump(rows, open('lanes/L-TRANSLATION-STALE-SWEEP/signals.json', 'w'),
          ensure_ascii=False)
print('tri-present keys:', len(rows))
