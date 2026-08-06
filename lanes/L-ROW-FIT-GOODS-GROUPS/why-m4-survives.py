"""Why the M4 mutant (digit test deleted) has no reachable difference in this builder.

Enumerates every `Row(` call site's LEFT argument in EscPosXZReportBuilder.cs and classifies the
shape of its trailing parenthesised group, which is the only input the digit test reads.
"""
import io
import re

SRC = "/Users/svendaneel/okam/wt-xzprinted/Services/Kassa/EscPosXZReportBuilder.cs"
s = io.open(SRC, encoding="utf-8").read()

# Every Row(...) invocation, excluding the declaration.
calls = []
for m in re.finditer(r"\bRow\(", s):
    if s[max(0, m.start() - 30):m.start()].rstrip().endswith("private static string"):
        continue
    i = m.end()
    depth = 1
    while depth:
        if s[i] == "(":
            depth += 1
        elif s[i] == ")":
            depth -= 1
        i += 1
    calls.append(s[m.end():i - 1])


def left_of(call):
    depth = 0
    for i, c in enumerate(call):
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif c == "," and depth == 0:
            return call[:i].strip()
    return call.strip()


NO_PAREN = "no trailing ')' - TrailingCount returns null on its first guard"
COUNT = 'ends with " (" + <long>.ToString(InvariantCulture) + ")"'
OTHER = "ANYTHING ELSE - the digit test would be load-bearing here"

buckets = {NO_PAREN: [], COUNT: [], OTHER: []}
for call in calls:
    left = " ".join(left_of(call).split())
    # Both spellings: the " (" welded onto a literal ("Salg (") and appended separately (+ " (").
    if re.search(r'\(" \+ .*ToString\(CultureInfo\.InvariantCulture\) \+ "\)"$', left):
        buckets[COUNT].append(left)
    elif re.match(r'^"[^"]*"$', left) and not left.rstrip('"').endswith(')'):
        buckets[NO_PAREN].append(left)
    else:
        buckets[OTHER].append(left)

for name, items in buckets.items():
    print("%s: %d" % (name, len(items)))
    for it in items:
        print("    %s" % (it[:100]))
    print()

print("Every count-bearing label is <prose> + \" (\" + <long>.ToString(InvariantCulture) + \")\".")
print("The digit test can therefore only ever see digits - unless a count is NEGATIVE, in which")
print("case ToString yields a leading '-' and the group stops qualifying. Demonstrated below.")
print()

WIDTH = 32


def fit(text, width):
    if not text or len(text) <= width:
        return text or ""
    return text[:max(0, width)] if width <= 1 else text[:width - 1] + "…"


def trailing(label, digit_test):
    if len(label) < 4 or label[-1] != ')':
        return None
    open_ = label.rfind('(')
    if open_ < 2 or label[open_ - 1] != ' ' or open_ + 1 == len(label) - 1:
        return None
    if digit_test and any(not c.isdigit() for c in label[open_ + 1:-1]):
        return None
    return label[open_ - 1:]


def row(left, right, digit_test):
    available = WIDTH - len(right) - 1
    if len(left) > available:
        c = trailing(left, digit_test)
        left = fit(left, available) if (c is None or len(c) > available) \
            else fit(left[:len(left) - len(c)], available - len(c)) + c
    return left + " " * (WIDTH - len(left) - len(right)) + right


for label, amount in [("Utleveringskvitt. (1234)", "1 234 567,89"),
                      ("Utleveringskvitt. (-12)", "1 234 567,89"),
                      ("Vipps (Surfboard) (1234)", "1 234 567,89")]:
    a = row(label, amount, digit_test=True)
    b = row(label, amount, digit_test=False)
    print("  %-26s pristine |%s|" % (label, a))
    print("  %-26s M4       |%s|   %s" % ("", b, "SAME" if a == b else "DIFFERS"))
