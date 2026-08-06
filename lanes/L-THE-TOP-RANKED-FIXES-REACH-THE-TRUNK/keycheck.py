#!/usr/bin/env python3
"""Translation-key conservation check across a merge.

For each dictionary: keys(base), keys(trunk), keys(lane), keys(merged).
A merge is key-safe when merged >= (trunk - deleted_by_lane) and
merged >= (lane - deleted_by_trunk).  Anything else is reported.
"""
import re
import subprocess
import sys

KEY = re.compile(r'^\s{1,6}([A-Za-z_][A-Za-z0-9_]*)\s*:')


def keys_from_text(text):
    return {m.group(1) for line in text.split('\n') for m in [KEY.match(line)] if m}


def keys_at(ref, path):
    out = subprocess.run(['git', 'show', '%s:%s' % (ref, path)],
                         capture_output=True, text=True, check=True)
    return keys_from_text(out.stdout)


base, trunk, lane = sys.argv[1], sys.argv[2], sys.argv[3]
bad = 0
for t in ('de', 'en', 'no'):
    p = 'translations/%s.ts' % t
    kb, kt, kl = keys_at(base, p), keys_at(trunk, p), keys_at(lane, p)
    km = keys_from_text(open(p, encoding='utf-8').read())
    print('%s: base=%d trunk=%d lane=%d merged=%d' % (t, len(kb), len(kt), len(kl), len(km)))
    lane_deleted = kb - kl
    trunk_deleted = kb - kt
    lost_trunk = (kt - km) - lane_deleted
    lost_lane = (kl - km) - trunk_deleted
    if lost_trunk:
        print('  LOST trunk keys (not deleted by the lane): %s' % sorted(lost_trunk)); bad += 1
    if lost_lane:
        print('  LOST lane keys (not deleted by the trunk): %s' % sorted(lost_lane)); bad += 1
    if not lost_trunk and not lost_lane:
        print('  no key lost from either side')
    print('  gained vs trunk: %s' % ' '.join(sorted(km - kt)))
    dropped_deliberately = sorted((kt - km) & lane_deleted) + sorted((kl - km) & trunk_deleted)
    if dropped_deliberately:
        print('  dropped by an explicit deletion on one side: %s' % dropped_deliberately)
print('VERDICT: %s' % ('KEY LOSS' if bad else 'no key loss'))
