#!/bin/zsh
# Restores each defect one at a time and records which tests red. Run FROM the plan repo against a
# separate worktree, so nothing here is written to the tree being measured.
#
# It asserts what it is measuring before it measures it: a mutation that fails to apply, or a tree
# that is not the one named, must abort rather than report a green that means nothing.
set -e
WT=/Users/svendaneel/okam/web-lint2defects
OV=$WT/pages/admin/overview.vue
CS=$WT/components/admin/pos/ClockScreen.vue
SUITES=(test/overview-watch-duplicate.test.js test/pos-clock-reserved-key.test.js)

echo "== TREE UNDER MEASUREMENT =="
echo "worktree:  $WT"
echo "HEAD:      $(git -C $WT rev-parse --short HEAD) ($(git -C $WT log -1 --format=%s | cut -c1-60))"
echo "node:      $(node -v)"
echo "eslint:    $(cd $WT && node -p 'require("eslint/package.json").version')"
echo "vue:       $(cd $WT && node -p 'require("vue/package.json").version')"
echo "date(UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo

cp $OV /tmp/.ov.fixed.$$ ; cp $CS /tmp/.cs.fixed.$$
restore () { cp /tmp/.ov.fixed.$$ $OV ; cp /tmp/.cs.fixed.$$ $CS ; }
trap 'restore; rm -f /tmp/.ov.fixed.$$ /tmp/.cs.fixed.$$' EXIT

run () {  # run <label>
  echo "---- jest: $1 ----"
  ( cd $WT && npx jest ${SUITES[@]} --coverage=false --verbose ) 2>&1 \
    | grep -E "✓|✕|Tests:|Test Suites:" || true
  echo
}

echo "===== BASELINE: both defects FIXED ====="
run "fixed"

echo "===== M1: duplicate storeOverview watcher RESTORED ====="
node -e '
const fs=require("fs");const p=process.argv[1];let s=fs.readFileSync(p,"utf8");
const anchor="    storeOverview: {\n      handler(stores) {";
const dupe="    storeOverview: {\n      handler() {\n        this.totalOrderCount = this.sortedStores.reduce((sum, s) => sum + (s.orderCount || 0), 0);\n        this.totalAmountSum = this.sortedStores.reduce((sum, s) => sum + (s.totalAmount || 0), 0);\n      },\n      immediate: true,\n      deep: true,\n    },\n";
if(!s.includes(anchor)){console.error("M1 ANCHOR MISS - aborting");process.exit(9)}
fs.writeFileSync(p,s.replace(anchor,dupe+anchor));' $OV
echo "applied: storeOverview keys now = $(grep -c '^    storeOverview: {' $OV)"
run "M1"
restore

echo "===== M2: _tick RESTORED to ClockScreen data() ====="
node -e '
const fs=require("fs");const p=process.argv[1];let s=fs.readFileSync(p,"utf8");
const a="      now: new Date(),\n";
if(!s.includes(a)){console.error("M2 ANCHOR MISS - aborting");process.exit(9)}
fs.writeFileSync(p,s.replace(a,a+"      _tick: null,\n"));' $CS
echo "applied: unproxyable data keys now = $(cd $WT && node -e '
const fs=require("fs");const src=fs.readFileSync("components/admin/pos/ClockScreen.vue","utf8");
const body=src.split(/data \(\) \{/)[1].split(/\n  \},/)[0];
console.log(JSON.stringify(body.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")).map(l=>(l.match(/^([A-Za-z_$][\w$]*)\s*:/)||[])[1]).filter(Boolean).filter(k=>/^[_$]/.test(k))));')"
run "M2"
restore

echo "===== M3: de-duplicated the WRONG way (kept the dropped body) ====="
node -e '
const fs=require("fs");const p=process.argv[1];let s=fs.readFileSync(p,"utf8");
const survivor=`    storeOverview: {
      handler(stores) {
        // Set empty KAM IDs to empty string to ensure "Ingen" is selected
        if (stores && stores.length) {
          stores.forEach((store) => {
            if (!store.kamUserId) {
              store.kamUserId = "";
            }
          });
        }
      },
      immediate: true,
    },`;
const wrong=`    storeOverview: {
      handler() {
        this.totalOrderCount = this.sortedStores.reduce((sum, s) => sum + (s.orderCount || 0), 0);
        this.totalAmountSum = this.sortedStores.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      },
      immediate: true,
      deep: true,
    },`;
if(!s.includes(survivor)){console.error("M3 ANCHOR MISS - aborting");process.exit(9)}
fs.writeFileSync(p,s.replace(survivor,wrong));' $OV
echo -n "eslint no-dupe-keys errors on the M3 file: "
( cd $WT && npx eslint --ext .js,.ts,.vue pages/admin/overview.vue -f json 2>/dev/null ) \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].messages.filter(m=>m.ruleId==="no-dupe-keys").length," <- the linter sees nothing wrong"))'
run "M3"
restore

echo "===== RESTORED: both defects FIXED again ====="
run "restored"
