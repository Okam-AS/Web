#!/usr/bin/env python3
"""Term-counterpart probe.

A curated glossary of load-bearing Norwegian terms, each with the set of
counterparts either target locale may legitimately use. A key fires when the
Norwegian value matches the NO pattern and the target value matches *none* of
its counterparts -- i.e. the Norwegian names a thing the target never names.

Chosen because the structural battery (length, sentence, numeral, clause,
statute) scores zero on every signal for the one key already known stale.
"""
import json, re

T = {f: json.load(open('lanes/L-TRANSLATION-STALE-SWEEP/%s.json' % f))['keys']
     for f in ('no', 'en', 'de')}
TRI = sorted(set(T['no']) & set(T['en']) & set(T['de']))

# (label, NO regex, EN counterpart regex, DE counterpart regex)
G = [
 # ---- tax -------------------------------------------------------------
 ('VAT',        r'\bmva\b|\bmva[.\-]|merverdiavgift|\bMVA\b',
                r'\bVAT\b|\bMVA\b|value[ -]added',
                r'MwSt|Mehrwertsteuer|\bUSt\b|\bMVA\b'),
 ('zero-rated', r'avgiftsfri|avgiftsfritt|fritatt|unntatt fra (mva|merverdi)',
                r'zero[- ]rat|tax[- ]free|exempt|no VAT|free of VAT',
                r'steuerfrei|Nullsatz|befreit|ausgenommen|ohne MwSt'),
 ('SAF-T',      r'SAF-?T',            r'SAF-?T',            r'SAF-?T'),
 ('excl. VAT',  r'eks(kl)?\.? *mva',  r'excl|without VAT|net\b|ex VAT',
                                      r'exkl|ohne MwSt|netto'),
 ('incl. VAT',  r'inkl\.? *mva',      r'incl|including VAT|gross\b',
                                      r'inkl|einschl|brutto'),
 ('rate',       r'\bsats(en|er|ene)?\b|\bmva-?sats',
                r'\brate|percentage|\bper cent|\bpercent',
                r'\bSatz|\bSätze|Prozentsatz|\bSteuersatz'),
 # ---- statute / obligation --------------------------------------------
 ('paragraph',  r'§',                 r'§|section \d|para',  r'§|Paragraf|Artikel \d'),
 ('bookkeeping-duty', r'bokf(ø|o)ringsplikt',
                r'bookkeeping (obligation|duty)|obliged to keep|liable to keep|statutory (bookkeeping|accounting)',
                r'buchf(ü|u)hrungspflicht|buchf(ü|u)hrungspflichtig'),
 ('bookkeeping', r'bokf(ø|o)r(ing|es|t|e)\b|bokf(ø|o)ringslov',
                r'bookkeep|book(ed|ing) |accounting|posted to the ledger|ledger',
                r'Buchf(ü|u)hrung|Buchhaltung|verbucht|gebucht|Buchung'),
 ('retention',  r'oppbevar(es|ing|ingsplikt|t)',
                r'retain|retention|kept for|stored for|preserve',
                r'aufbewahr|Aufbewahrung|gespeichert'),
 ('org-number', r'organisasjonsnummer|\borg\.?nr',
                r'organisation number|organization number|company number|business number|org\.? ?no',
                r'Organisationsnummer|Unternehmensnummer|Firmennummer|Handelsregisternummer'),
 ('personal-data', r'personopplysning',
                r'personal data|personal information|personally identifi',
                r'personenbezogen|persönliche Daten|Personendaten'),
 ('required-by-law', r'lovp(å|a)lagt|etter loven|i henhold til lov|lovkrav|p(å|a)budt',
                r'by law|statutor|legally requir|required by|regulation requires',
                r'gesetzlich|nach dem Gesetz|Vorschrift|vorgeschrieben'),
 ('authority',  r'skatteetaten|mattilsynet|arbeidstilsynet|altinn',
                r'skatteetaten|tax authorit|food safety authorit|labour inspect|altinn',
                r'skatteetaten|Steuerbeh(ö|o)rde|Lebensmittelbeh(ö|o)rde|Arbeitsinspekt|altinn'),
 # ---- what a control does ---------------------------------------------
 ('governs',    r'\bstyrer\b|\bstyres\b|\bstyre\b|\bavgj(ø|o)r(er)?\b|\bbestemmer\b',
                r'govern|control|decid|determin|driv|set(s)? the|dictat|is what sets',
                r'steuer|bestimm|entscheid|regel|legt fest|gibt .* vor'),
 ('overwrites', r'overskriv|erstatt(er|es)\b',
                r'overwrit|replac|overrid',
                r'überschreib|ersetz'),
 ('deletes',    r'\bslette(s|r)?\b|\bfjernes\b|\bt(ø|o)mmes\b',
                r'delet|remov|clear|purg|erase|wipe',
                r'l(ö|o)sch|entfern|geleert|leeren|bereinig'),
 ('irreversible', r'kan ikke (endres|angres|rettes|gj(ø|o)res om|reverseres)|ugjenkallelig|endelig|permanent|ikke omgj(ø|o)res',
                r'cannot be (chang|undone|revers|correct|edit|amend)|irrevers|permanent|final|no way back|can never',
                r'kann nicht (ge(ä|a)ndert|r(ü|u)ckg(ä|a)ngig|korrigiert)|unwiderruflich|endg(ü|u)ltig|dauerhaft|nicht mehr (ä|a)nderbar'),
 ('never',      r'\baldri\b',   r'\bnever\b|\bno .* ever|\bcannot ever', r'\bnie\b|\bniemals\b|\bnimmer\b'),
 ('always',     r'\balltid\b',  r'\balways\b|\bevery time\b|\bat all times', r'\bimmer\b|\bstets\b|\bjedes Mal'),
 ('only',       r'\bbare\b|\bkun\b', r'\bonly\b|\bjust\b|\bsolely\b|\bnothing but', r'\bnur\b|\blediglich\b|\bausschliesslich\b|\bausschließlich\b'),
 ('automatic',  r'automatisk', r'automatic', r'automatisch'),
 ('required',   r'\bkreve(r|s)?\b|\bp(å|a)krevd\b|\bobligatorisk\b',
                r'requir|mandator|must|need(s|ed)? |compulsor',
                r'erforder|ben(ö|o)tig|verlang|muss|müssen|Pflicht|zwingend|notwendig|vorausgesetzt'),
 ('blocks',     r'\bblokker|\bhindrer\b|\bstopper\b|\bavvis(er|es)?\b|\bnekter\b|\bsperre',
                r'block|prevent|stop|refus|reject|deny|bar\b|lock',
                r'blockier|verhinder|stopp|lehnt? .*ab|ablehn|verweiger|sperr'),
 ('cannot',     r'kan ikke|kan ingen|g(å|a)r ikke an|lar seg ikke',
                r'cannot|can(no|\')t|is not possible|unable|no way to|there is no',
                r'kann nicht|k(ö|o)nnen nicht|nicht m(ö|o)glich|l(ä|a)sst sich nicht|gibt es nicht|keine M(ö|o)glichkeit'),
]

hits = []
for k in TRI:
    no = T['no'][k]
    for label, rno, ren, rde in G:
        if not re.search(rno, no, re.I):
            continue
        for tgt, rt in (('en', ren), ('de', rde)):
            if not re.search(rt, T[tgt][k], re.I):
                hits.append({'key': k, 'term': label, 'tgt': tgt,
                             'no': no, 'val': T[tgt][k]})
json.dump(hits, open('lanes/L-TRANSLATION-STALE-SWEEP/glossary-hits.json', 'w'),
          ensure_ascii=False)
print('glossary hits:', len(hits), 'distinct keys:', len({h['key'] for h in hits}))
from collections import Counter
for t, c in Counter(h['term'] for h in hits).most_common():
    print('  %-18s %d' % (t, c))
