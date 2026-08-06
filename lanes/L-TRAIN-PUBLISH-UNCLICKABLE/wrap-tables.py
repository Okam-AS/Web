#!/usr/bin/env python3
"""Wrap every `.trn-table` on the Training surface in a scroll container.

A table box never shrinks below its own min-content width, so a six- or seven-column table in a
488px grid track overflows the track. Its last cell — which is where the action buttons live — then
lands under the next column, which is painted later and wins the hit test. `overflow-x: auto` on a
wrapper contains the overflow instead of letting it escape.

Done as a script rather than by hand because the `v-if`/`v-else` on several of these tables has to
move to the wrapper (a `v-else` must be the immediate next sibling of its `v-if`), and the whole
block needs re-indenting. Both are easy to get subtly wrong eight times.
"""
import re
import sys

INDENT = '  '


def wrap(path):
    src = open(path).read()
    lines = src.split('\n')
    out = []
    i = 0
    changed = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^(\s*)<table\b([^>]*)>$', line)
        if not m or 'trn-table' not in line:
            out.append(line)
            i += 1
            continue

        indent, attrs = m.group(1), m.group(2)

        # A `v-else` / `v-else-if` / `v-if` has to sit on the WRAPPER: `v-else` is only valid as the
        # immediate next sibling of its `v-if`, and inserting a div between them would break it.
        directive = ''
        dm = re.search(r'\s(v-else-if="[^"]*"|v-else|v-if="[^"]*")', attrs)
        if dm:
            directive = ' ' + dm.group(1)
            attrs = attrs.replace(dm.group(0), '', 1)

        # Find the matching close at the same indent.
        close = None
        for j in range(i + 1, len(lines)):
            if lines[j] == indent + '</table>':
                close = j
                break
        if close is None:
            raise SystemExit('no matching </table> for %s:%d' % (path, i + 1))

        out.append('%s<div%s class="trn-table-scroll">' % (indent, directive))
        out.append('%s%s<table%s>' % (indent, INDENT, attrs))
        for k in range(i + 1, close):
            out.append((INDENT + lines[k]) if lines[k].strip() else lines[k])
        out.append('%s%s</table>' % (indent, INDENT))
        out.append('%s</div>' % indent)
        changed += 1
        i = close + 1

    if changed:
        open(path, 'w').write('\n'.join(out))
    print('%-58s %d table(s) wrapped' % (path.split('/')[-1], changed))
    return changed


if __name__ == '__main__':
    total = sum(wrap(p) for p in sys.argv[1:])
    print('total %d' % total)
