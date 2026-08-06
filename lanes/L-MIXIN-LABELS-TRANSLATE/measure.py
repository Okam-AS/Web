#!/usr/bin/env python3
"""Measure this lane's two claims mechanically, from objects rather than from prose.

CLAIM 1 — ZERO NORWEGIAN DRIFT. The pre-lane `switch` statements are read out of the git object
`e34977a:plugins/global-mixin.js`, and every literal they returned is compared with the Norwegian
value of the dictionary key the new map resolves for that same member. Neither side is written by
hand here: the old literals come from git, the new mapping comes from the shipped file, and the
words come from `translations/no.ts`.

CLAIM 2 — COVERAGE READ FROM THE BACKEND. `Enums/DeliveryType.cs` and `Enums/OrderStatus.cs` are
read by object out of OkamAPI at a named commit, and compared with the maps' key sets. Enumerating
a switch from its own cases passes by construction — that is how paymentTypeLabel shipped seven
unlabelled members — so the population is never taken from the file under test.

Writes measured.json beside this script. Nothing here mutates any repository.
"""
import json
import os
import re
import subprocess

WEB = '/Users/svendaneel/okam/web-mixinlabels'
API = '/Users/svendaneel/okam/OkamAPI'
BASE = 'e34977a'                                    # the commit both switches were last shipped at
API_COMMIT = '597192efa5be8a3c373b7a3c992cb089cb5ebbda'
LANE = os.path.dirname(os.path.abspath(__file__))


def show(repo, spec):
    return subprocess.run(['git', '-C', repo, 'show', spec],
                          capture_output=True, text=True, check=True).stdout


def read_switch(src, fn):
    """Every `case 'X': return 'Y'` plus the `default:` of one method, in source order."""
    body = re.search(r'\n    %s \(\w+\) \{\n(.*?)\n    \},\n' % fn, src, re.S)
    assert body, 'no %s switch at %s' % (fn, BASE)
    cases = dict(re.findall(r"case '([A-Za-z]+)': return '([^']*)'", body.group(1)))
    default = re.search(r"default: return '([^']*)'", body.group(1))
    assert default, 'no default in %s' % fn
    return cases, default.group(1)


def read_map(src, name):
    body = re.search(r'\nconst %s = \{\n(.*?)\n\}\n' % name, src, re.S)
    assert body, 'no %s in the shipped mixin' % name
    return dict(re.findall(r'^\s*([A-Za-z]+): \'([a-zA-Z_]+)\'', body.group(1), re.M))


def read_dict(lang):
    src = open(os.path.join(WEB, 'translations', '%s.ts' % lang), encoding='utf-8').read()
    return dict(re.findall(r"^\s{2}([A-Za-z0-9_]+): '((?:[^'\\]|\\.)*)',?$", src, re.M))


def read_cs_enum(path):
    src = show(API, '%s:%s' % (API_COMMIT, path))
    src = re.sub(r'//.*', '', src)
    return dict((m, int(v)) for m, v in re.findall(r'(\w+)\s*=\s*(\d+)\s*,?', src))


old_src = show(WEB, '%s:plugins/global-mixin.js' % BASE)
new_src = open(os.path.join(WEB, 'plugins', 'global-mixin.js'), encoding='utf-8').read()

old_delivery, old_delivery_default = read_switch(old_src, 'deliveryTypeLabel')
old_status, old_status_default = read_switch(old_src, 'orderStatusLabel')
new_delivery = read_map(new_src, 'DELIVERY_TYPE_LABEL_KEYS')
new_status = read_map(new_src, 'ORDER_STATUS_LABEL_KEYS')
no = read_dict('no')
en = read_dict('en')
de = read_dict('de')

backend_delivery = read_cs_enum('Enums/DeliveryType.cs')
backend_status = read_cs_enum('Enums/OrderStatus.cs')

drift = []
for old_cases, new_map, default, fallback_key, what in (
        (old_delivery, new_delivery, old_delivery_default, 'orders_deliveryNotSet', 'delivery'),
        (old_status, new_status, old_status_default, 'orders_statusNotSet', 'status')):
    for member, literal in sorted(old_cases.items()):
        key = new_map.get(member)
        rendered = no.get(key) if key else None
        if rendered != literal:
            drift.append({'what': what, 'member': member, 'was': literal,
                          'key': key, 'now': rendered})
    if no.get(fallback_key) != default:
        drift.append({'what': what, 'member': '<default>', 'was': default,
                      'key': fallback_key, 'now': no.get(fallback_key)})

result = {
    'base_commit': BASE,
    'api_commit': API_COMMIT,
    'norwegian_drift': drift,
    'norwegian_drift_count': len(drift),
    'old_switch_case_count': {'delivery': len(old_delivery), 'status': len(old_status)},
    'old_switch_default': {'delivery': old_delivery_default, 'status': old_status_default},
    'backend_members': {'delivery': backend_delivery, 'status': backend_status},
    'delivery_backend_members_unmapped': sorted(set(backend_delivery) - set(new_delivery)),
    'delivery_mapped_non_members': sorted(set(new_delivery) - set(backend_delivery)),
    'status_backend_members_unmapped': sorted(set(backend_status) - set(new_status)),
    'status_mapped_non_members': sorted(set(new_status) - set(backend_status)),
    'old_switch_delivery_members_missing_vs_backend':
        sorted(set(backend_delivery) - set(old_delivery)),
    'old_switch_status_members_missing_vs_backend':
        sorted(set(backend_status) - set(old_status)),
    'keys_missing_from_a_dictionary': sorted(
        '%s:%s' % (lang, key)
        for key in set(list(new_delivery.values()) + list(new_status.values()) +
                       ['orders_deliveryNotSet', 'orders_statusNotSet'])
        for lang, d in (('no', no), ('en', en), ('de', de))
        if not d.get(key)),
    'german_equals_norwegian': sorted(
        key for key in set(list(new_delivery.values()) + list(new_status.values()) +
                           ['orders_deliveryNotSet', 'orders_statusNotSet'])
        if de.get(key) == no.get(key)),
    'dictionary_key_counts': {'no': len(no), 'en': len(en), 'de': len(de)},
    # Counted with ONE counter across the whole chain, because a count is only comparable to another
    # count taken the same way. The brief quotes 4817/4782/4782 at the base where this counter reads
    # 4816/4781/4781 — a uniform off-by-one in the method, not a missing key. What the two agree on
    # is the DELTA: +5 from the parent lane, +4 from this one, and `duplicate_keys` empty throughout.
    'dictionary_key_counts_along_the_chain': {
        commit: {lang: len(re.findall(r'^\s{2}[A-Za-z0-9_]+\s*:',
                                      show(WEB, '%s:translations/%s.ts' % (commit, lang)), re.M))
                 for lang in ('no', 'en', 'de')}
        for commit in (BASE, '4465d02', 'HEAD')},
    'duplicate_keys': {
        lang: sorted(k for k in set(re.findall(r'^\s{2}([A-Za-z0-9_]+)\s*:', src, re.M))
                     if re.findall(r'^\s{2}%s\s*:' % k, src, re.M).__len__() > 1)
        for lang, src in (
            (l, open(os.path.join(WEB, 'translations', '%s.ts' % l), encoding='utf-8').read())
            for l in ('no', 'en', 'de'))},
}

with open(os.path.join(LANE, 'measured.json'), 'w', encoding='utf-8') as fh:
    json.dump(result, fh, indent=2, ensure_ascii=False, sort_keys=True)

print(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True))
