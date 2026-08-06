import os,re,json
ROOT="/Users/svendaneel/okam/Web-modules"
SKIP={"node_modules",".nuxt","dist",".git","lanes","core","artifacts",".output"}
res={"files":0,"imports_core_pinia":[],"imports_PaymentType":[],"PaymentType_dot":[],
     "calls_paymentLabel":[],"calls_payedLabel":[],"renders_paymentTypeLabel":[]}
for dp,dn,fn in os.walk(ROOT):
    dn[:]=[d for d in dn if d not in SKIP]
    for f in fn:
        if not f.endswith((".ts",".tsx",".js",".jsx",".vue",".mjs")): continue
        p=os.path.join(dp,f); res["files"]+=1
        s=open(p,encoding="utf-8",errors="ignore").read()
        rel=os.path.relpath(p,ROOT)
        if re.search(r"core/pinia",s): res["imports_core_pinia"].append(rel)
        for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*['\"][^'\"]*core/enums",s):
            if "PaymentType" in m.group(1): res["imports_PaymentType"].append(rel)
        if re.search(r"\bPaymentType\s*\.\s*[A-Za-z]",s): res["PaymentType_dot"].append(rel)
        if re.search(r"\bpaymentLabel\s*\(",s): res["calls_paymentLabel"].append(rel)
        if re.search(r"\bpayedLabel\s*\(",s): res["calls_payedLabel"].append(rel)
        if re.search(r"\bpaymentTypeLabel\s*\(",s): res["renders_paymentTypeLabel"].append(rel)
print(json.dumps(res,indent=1))
