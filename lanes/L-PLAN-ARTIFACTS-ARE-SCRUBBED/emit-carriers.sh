#!/bin/bash
# Emits the credential VALUES named by F-POWERUSER-CODE-IS-COMMITTED,
# F-JWT-SIGNING-KEY-COMMITTED, F-PROD-STORES-APIKEY-HARDCODED and F-AZURE-FUNCKEY,
# read from their own source files in the OkamAPI repository.
#
# Output: one carrier per line, "<config-key-name><TAB><value>".
# This script contains NO credential value. NEVER redirect its output to a file.
# Usage: bash emit-carriers.sh | cut -f2   (values)  /  cut -f1 (names)
set -euo pipefail
API=/Users/svendaneel/okam/OkamAPI

python3 - "$API" <<'PY'
import json, re, subprocess, sys
api = sys.argv[1]

def show(ref, path):
    return subprocess.run(["git", "-C", api, "show", f"{ref}:{path}"],
                          capture_output=True, text=True).stdout

out = []  # (name, value)
for ref in ("feature/restaurant-modules", "feature/swiss", "origin/master"):
    s = show(ref, "appsettings.json")
    if s:
        a = json.loads(s).get("AppSettings", {})
        for k in ("Secret", "PowerUserVerificationCode", "DemoVerificationCode"):
            v = a.get(k)
            if v:
                out.append((f"AppSettings__{k}", str(v)))
    sc = show(ref, "Controllers/StoresController.cs")
    if "X-Okam-ApiKey" in sc:
        for m in re.finditer(r'"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
                             r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"', sc):
            out.append(("StoresController__XOkamApiKey", m.group(1)))
    fr = show(ref, "Services/OkamFunctionsDocumentRenderer.cs")
    for m in re.finditer(r'FunctionKey\s*=\s*"([^"]+)"', fr):
        out.append(("OkamFunctionsDocumentRenderer__FunctionKey", m.group(1)))

seen, rows = set(), []
for name, v in out:
    if v not in seen:
        seen.add(v)
        rows.append(f"{name}\t{v}")
print("\n".join(rows))
PY
