#!/usr/bin/env python3
"""Re-runnable measurement for L-PAYMENT-LABEL-UKJENT.

Prints only what it parsed. Every population is read from the side that DECLARES it:

  * the payment types from the backend enum, by git object, never a working tree;
  * the label map and the switch it replaced from the two revisions of the mixin;
  * the words from the three dictionaries.

Nothing is enumerated from the thing under test. Run:  python3 measure.py
"""
import json
import os
import re
import subprocess

API = "/Users/svendaneel/okam/OkamAPI"
API_REF = "8e2b57de"
LANE_TREE = "/Users/svendaneel/okam/web-paylabel"
BASE_REF = "e34977a"  # feature/restaurant-modules tip this lane branched from

out = {}


def members_from_cs(src):
    """Members of `enum PaymentType`, comments stripped first so prose cannot manufacture one."""
    body = re.sub(r"//[^\n]*", "", src)
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    inner = body[body.index("{", body.index("enum PaymentType")) + 1:]
    depth, buf = 1, []
    for ch in inner:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        buf.append(ch)
    return [(m.group(1), int(m.group(2))) for m in re.finditer(r"(\w+)\s*=\s*(-?\d+)", "".join(buf))]


# 1. THE POPULATION — the backend enum, by object.
cs = subprocess.run(["git", "show", API_REF + ":Enums/PaymentType.cs"],
                    cwd=API, capture_output=True, text=True, check=True).stdout
backend = members_from_cs(cs)
out["backend_ref"] = API_REF
out["backend_members"] = [name for name, _ in backend]
out["backend_values"] = {name: value for name, value in backend}
out["backend_count"] = len(backend)

# 2. WHAT THE SWITCH USED TO HANDLE — read from the base revision, not from memory.
before = subprocess.run(["git", "show", BASE_REF + ":plugins/global-mixin.js"],
                        cwd=LANE_TREE, capture_output=True, text=True, check=True).stdout
seg = before[before.index("paymentTypeLabel (paymentTypeEnum)"):]
seg = seg[:seg.index("deliveryTypeLabel")]
old_cases = re.findall(r"case '([^']+)'", seg)
out["before_switch_cases"] = old_cases
out["before_switch_default"] = re.search(r"default:\s*return\s*'([^']*)'", seg).group(1)
out["before_fell_to_default"] = [n for n in out["backend_members"] if n not in old_cases]

# 3. WHAT THE MAP HANDLES NOW.
after = open(os.path.join(LANE_TREE, "plugins/global-mixin.js"), encoding="utf-8").read()
map_body = after[after.index("const PAYMENT_TYPE_LABEL_KEYS = {"):]
map_body = map_body[:map_body.index("\n}")]
pairs = re.findall(r"^\s{2}(\w+): '([^']+)'", map_body, flags=re.M)
out["map_members"] = [m for m, _ in pairs]
out["map_count"] = len(pairs)
out["missing_from_map"] = [n for n in out["backend_members"] if n not in out["map_members"]]
out["extra_in_map"] = [m for m in out["map_members"] if m not in out["backend_members"]]
method = after[after.index("paymentTypeLabel (paymentTypeEnum)"):]
method = method[:method.index("deliveryTypeLabel")]
out["after_fallback_key"] = re.search(r": '(\w+)'\n\s*return this\.\$i\(key\)", method).group(1)
out["after_widened_default"] = out["after_fallback_key"] != "orders_paymentUnknown"

# 4. THE WORDS — each dictionary read in its OWN right. `translate` falls back no -> en -> de, so a
#    key present only in Norwegian renders Norwegian on the German build and looks translated.
words, gaps = {}, []
for lang in ("no", "en", "de"):
    src = open(os.path.join(LANE_TREE, "translations/%s.ts" % lang), encoding="utf-8").read()
    dictionary = dict(re.findall(r"^  (\w+): '((?:[^'\\]|\\.)*)',?$", src, flags=re.M))
    words[lang] = {}
    for member, _ in pairs:
        key = dict(pairs)[member]
        if key in dictionary:
            words[lang][member] = dictionary[key].replace("\\'", "'")
        else:
            gaps.append([lang, member, key])
    words[lang]["__unknown_fallback__"] = dictionary.get("orders_paymentUnknown")
out["rendered_words"] = words
out["dictionary_gaps"] = gaps

print(json.dumps(out, indent=1, ensure_ascii=False))
