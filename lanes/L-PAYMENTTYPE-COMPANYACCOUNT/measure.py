import json, re, subprocess, os
ROOT="/Users/svendaneel/okam/Web-modules"
API="/Users/svendaneel/okam/OkamAPI"
out={}

# 1. backend enum by object at 8e2b57de
src=subprocess.run(["git","show","8e2b57de:Enums/PaymentType.cs"],cwd=API,capture_output=True,text=True).stdout
# strip comments
body=re.sub(r"//[^\n]*","",src)
body=re.sub(r"/\*.*?\*/","",body,flags=re.S)
inner=body[body.index("{",body.index("enum PaymentType"))+1:]
depth=1;buf=[]
for ch in inner:
    if ch=="{":depth+=1
    elif ch=="}":
        depth-=1
        if depth==0:break
    buf.append(ch)
be=[m.group(1) for m in re.finditer(r"(\w+)\s*=\s*(-?\d+)","".join(buf))]
out["backend_members"]=be
out["backend_count"]=len(be)

# 2. frontend mirror at the pinned core
fe_src=open(os.path.join(ROOT,"core/enums/payment-type.ts")).read()
fe_body=re.sub(r"//[^\n]*","",fe_src)
fe_body=re.sub(r"/\*.*?\*/","",fe_body,flags=re.S)
fe=[m.group(1) for m in re.finditer(r"(\w+)\s*=\s*\"",fe_body)]
out["mirror_members"]=fe
out["mirror_count"]=len(fe)
out["missing_from_mirror"]=[m for m in be if m not in fe]
out["extra_in_mirror"]=[m for m in fe if m not in be]

# 3. global-mixin switch cases (raw strings, not the mirror)
gm=open(os.path.join(ROOT,"plugins/global-mixin.js")).read()
i=gm.index("paymentTypeLabel (paymentTypeEnum)")
seg=gm[i:gm.index("deliveryTypeLabel",i)]
cases=re.findall(r"case '([^']+)'",seg)
out["global_mixin_cases"]=cases
out["global_mixin_has_default"]=("default:" in seg)
out["global_mixin_default_returns"]=re.search(r"default:\s*return\s*'([^']*)'",seg).group(1)
out["backend_members_falling_to_default"]=[m for m in be if m not in cases]

# 4. checkout ladder branches + fallback (pinned core)
ck=open(os.path.join(ROOT,"core/pinia/checkout.ts")).read()
j=ck.index("const paymentLabel")
seg2=ck[j:ck.index("// Discount code",j)]
out["checkout_ladder_branches"]=re.findall(r"PaymentType\.(\w+)",seg2)
out["checkout_ladder_tail"]=seg2.strip().splitlines()[-2].strip()

# 5. order.ts ladder
od=open(os.path.join(ROOT,"core/pinia/order.ts")).read()
k=od.index("const payedLabel")
seg3=od[k:od.index("const progressFlow",k)]
out["order_ladder_branches"]=sorted(set(re.findall(r"PaymentType\.(\w+)",seg3)))
out["order_ladder_tail"]=[l.strip() for l in seg3.strip().splitlines() if "return" in l][-1]
print(json.dumps(out,indent=1))
