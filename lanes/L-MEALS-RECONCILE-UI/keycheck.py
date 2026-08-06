import re, sys, pathlib
ROOT = pathlib.Path('/Users/svendaneel/okam/web-mealsrecon')
srcs = [
    ROOT/'components/admin/meals/MealsReconciliationQueue.vue',
    ROOT/'components/admin/meals/MealsMonthClose.vue',
    ROOT/'pages/admin/meals-agreements.vue',
]
used = set()
for s in srcs:
    t = s.read_text(encoding='utf-8')
    used |= set(re.findall(r"\$i\(\s*'([a-z0-9_]+)'", t))
    # keys named inside the label maps (object literal keys -> 'meals_...')
    used |= set(re.findall(r":\s*'(meals_[a-z0-9_]+)'", t))
missing_any = False
for lang in ('no','en','de'):
    text = (ROOT/f'translations/{lang}.ts').read_text(encoding='utf-8')
    defined = {}
    for m in re.finditer(r"^\s{2}([a-z0-9_]+):\s*'(.*?)',\s*$", text, re.M):
        defined[m.group(1)] = m.group(2)
    missing = sorted(k for k in used if k not in defined)
    empty   = sorted(k for k in used if k in defined and not defined[k].strip())
    print(f'{lang}: used={len(used)} missing={missing} empty={empty}')
    if missing or empty:
        missing_any = True
# duplicate-key check on the three files (a second definition silently wins)
for lang in ('no','en','de'):
    text = (ROOT/f'translations/{lang}.ts').read_text(encoding='utf-8')
    keys = re.findall(r"^\s{2}([a-z0-9_]+):", text, re.M)
    dupes = sorted({k for k in keys if keys.count(k) > 1 and (k.startswith('meals_rc_') or k.startswith('meals_mc_'))})
    print(f'{lang}: new-family duplicate keys = {dupes}')
    if dupes:
        missing_any = True
sys.exit(1 if missing_any else 0)
