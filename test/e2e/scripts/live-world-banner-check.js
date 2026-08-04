#!/usr/bin/env node
//
// DOES `live-world.sh` STILL TELL THE OPERATOR THE TRUTH ABOUT THE RESET THAT EXISTS?
//
//   node test/e2e/scripts/live-world-banner-check.js
//   npm run test:e2e:live-world-banner
//
// ---- WHY THIS EXISTS --------------------------------------------------------------------------
//
// `test/e2e/scripts/live-world-reset.sh` landed on 2026-08-02 (337f9bf) and repealed the rule that a
// live world hosts ONE journey: it images a freshly seeded world and puts it back in about nine
// seconds with no migration replay. Nine references to it were added across `playwright.config.js`,
// two journey headers and the assertion helpers — and NONE from `live-world.sh`, which is the script
// an operator actually runs and therefore the only one of those surfaces read at the moment of
// decision. Its header and its closing banner — the LAST TEXT ON THE TERMINAL — went on saying "a
// live world has no such thing" and "incompatible, and each needs its own world", and went on
// printing a recipe that invoked `live-world.sh` twice: two full chain replays, ~42s warm each, for a
// pair a nine-second restore separates.
//
// That cost more than the rebuilds. A brief is written from what the estate says about itself, so the
// stale banner was paraphrased into the premise of a whole lane — `L-LIVE-WORLD-RESET`, dispatched to
// build a reset that had already existed for two days, returned `fail-spec`. A false sentence in
// operator-facing text is not a cosmetic defect; it is a defect that manufactures work.
//
// The correction is one edit. This file is the reason the correction does not rot: two files now have
// to agree with each other, and the next person who changes one without the other gets a red.
//
// ---- WHAT IT ASSERTS --------------------------------------------------------------------------
//
// Regions are found STRUCTURALLY, never by matching a sentence: the header is the leading `#` comment
// block, and the banner is the last heredoc in the file. Both survive any rewording of their contents.
//
//   R0  Both regions can be located at all. If the banner heredoc is gone, this FAILS CLOSED rather
//       than passing vacuously — a check that cannot see its subject has no opinion worth trusting.
//   R1  While the reset script EXISTS, the header names it.
//   R2  While the reset script EXISTS, the closing banner names it.
//   R3  The banner contains no invocation of `live-world.sh` and no bare `$0`. The banner is printed
//       BY that script, after the world is up; the only reason to name itself there is to tell the
//       reader to build a SECOND world, which is the two-rebuild recommendation this lane removed.
//   R4  Every `live-world-reset.sh <verb>` anywhere in `live-world.sh` uses a verb the reset script's
//       own `case` statement actually implements. Verbs are PARSED from the reset script, not listed
//       here, so renaming `restore` in one file and not the other reds.
//   R5  Every `VAR=` passed on a logical line that invokes the reset names a variable the reset
//       actually reads. That set is parsed from the reset script too, so an env-var rename reds.
//   R6  The banner offers a RUNNABLE reset, not just a mention: it invokes the reset with at least
//       one implemented verb, and with the between-journeys verb the reset script itself advertises
//       in its own `snapshot` branch (derived, not hardcoded; falls back to "any implemented verb"
//       and says so if that branch stops printing a recipe).
//   R7  THE OTHER DIRECTION. If the reset script is ABSENT, `live-world.sh` must NOT name it — a
//       banner promising a command that cannot run is the same defect wearing the opposite sign.
//       This is what makes the file a CONTRADICTION check between two files rather than a spell
//       checker for one.
//
// ---- WHAT IT CANNOT SEE, AND WHY IT IS STILL WORTH KEEPING -------------------------------------
//
// Stated plainly, because a guard whose blind spots are unknown is trusted for things it never did:
//
//   • IT DOES NOT READ. A denial written entirely in vocabulary it has no rule for — "run this script
//     again for the next one", naming neither the script nor `$0` — passes R3. What it CAN'T be
//     defeated by is rewording the old sentences: R1/R2 demand the reset be NAMED, and no paraphrase
//     of "there is no reset" can name the reset. That is the mutation that actually happens (someone
//     restores the old prose), and it is the one that reds.
//   • IT PROVES NOTHING ABOUT THE RESET WORKING. Whether `restore` really returns a world in nine
//     seconds needs a SQL container, a seeded catalog and a journey. `L-LIVE-WORLD-RESTORE` proved
//     that live and its evidence is the record; this file only checks that the two texts agree.
//   • IT DOES NOT CHECK OTHER SURFACES. `playwright.config.js`, the two workforce spec headers and
//     `support/journey-assertions.js` already name the reset and have their own owners.
//   • IT DOES NOT WATCH `die` MESSAGES. Two of them recommend a rebuild (`Rebuild from empty: $0`),
//     deliberately left alone: both fire on a world this script has just recreated from empty, where
//     a restore would reinstate the very state being refused. They are outside both regions on
//     purpose, not by oversight.
//   • IT DOES NOT JUDGE the causal story the banner tells (the collision is the FLAG, not the week).
//     That correction is made in the text; nothing here pins it.
//
// ---- THE AFFORDANCE ITS OWN PROOF USES --------------------------------------------------------
//
// `--script` and `--reset` override the two inputs so the mutation proof can operate on COPIES and
// never touch a file a sibling lane may be reading. With no arguments it checks the real pair.
//
//   node test/e2e/scripts/live-world-banner-check.js --script /tmp/mutant.sh --reset /tmp/reset.sh

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_SCRIPT = path.join(REPO_ROOT, 'test', 'e2e', 'scripts', 'live-world.sh');
const DEFAULT_RESET = path.join(REPO_ROOT, 'test', 'e2e', 'scripts', 'live-world-reset.sh');

function parseArgs(argv) {
  const out = { script: DEFAULT_SCRIPT, reset: DEFAULT_RESET };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--script') { out.script = path.resolve(argv[i + 1] || ''); i += 1; }
    else if (argv[i] === '--reset') { out.reset = path.resolve(argv[i + 1] || ''); i += 1; }
    else { throw new Error('unknown argument: ' + argv[i]); }
  }
  return out;
}

// ---- REGIONS, FOUND BY STRUCTURE ---------------------------------------------------------------

// The leading comment block: every line from the top that is a `#` comment. Ends at the first line
// that is not (in practice `set -euo pipefail`). No sentence is matched to find it.
function headerBlock(lines) {
  const out = [];
  for (const line of lines) {
    if (!/^#/.test(line)) break;
    out.push(line);
  }
  return out;
}

// The closing banner: the LAST heredoc body in the file. Located by `cat <<EOF` / terminator, so the
// banner can be rewritten word for word and still be found.
function lastHeredoc(lines) {
  const starts = [];
  lines.forEach((line, i) => {
    if (/^\s*cat\s*<<-?\s*['"]?EOF['"]?\s*$/.test(line)) starts.push(i);
  });
  for (let s = starts.length - 1; s >= 0; s -= 1) {
    const from = starts[s];
    for (let i = from + 1; i < lines.length; i += 1) {
      if (/^\s*EOF\s*$/.test(lines[i])) {
        return { from: from + 1, to: i, body: lines.slice(from + 1, i) };
      }
    }
  }
  return null;
}

// Continuation-joined lines. The recipes put their env vars on the line above the command, joined by
// a trailing backslash (`\` in a comment, `\\` in a heredoc source). Joining them is what lets R5 ask
// "which variables were passed to THIS invocation" without guessing a line window.
function logicalLines(lines) {
  const out = [];
  let buf = null;
  for (const line of lines) {
    const trimmed = line.replace(/\s+$/, '');
    const continues = /\\$/.test(trimmed);
    const piece = continues ? trimmed.replace(/\\+$/, '') : trimmed;
    buf = buf === null ? piece : buf + ' ' + piece;
    if (!continues) { out.push(buf); buf = null; }
  }
  if (buf !== null) out.push(buf);
  return out;
}

// ---- WHAT THE RESET SCRIPT SAYS ABOUT ITSELF ---------------------------------------------------

// Implemented verbs, from its own `case` statement. Parsed so that a rename reds instead of being
// silently accepted by a list frozen in this file.
function implementedVerbs(resetText) {
  const lines = resetText.split('\n');
  const start = lines.findIndex((l) => /^\s*case\s+"?\$\{?COMMAND\}?"?\s+in\s*$/.test(l));
  if (start < 0) return null;
  const verbs = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*esac\s*$/.test(lines[i])) break;
    const m = /^\s*([a-z][a-z0-9_-]*)\)\s*$/.exec(lines[i]);
    if (m) verbs.push(m[1]);
  }
  return verbs.length ? verbs : null;
}

// Variables it reads, from its own `NAME="${NAME:-default}"` defaulting block.
function readVariables(resetText) {
  const names = new Set();
  const re = /^([A-Z][A-Z0-9_]*)="?\$\{\1:-/gm;
  let m;
  while ((m = re.exec(resetText)) !== null) names.add(m[1]);
  return names;
}

// The between-journeys verb, as the reset script itself advertises it: the recipe printed by its own
// `snapshot` branch ("now run a journey, reset, and run the next one"). DERIVED so that renaming the
// verb consistently in both files stays green, and renaming it in one reds.
function advertisedBetweenVerb(resetText, basename) {
  const lines = resetText.split('\n');
  const start = lines.findIndex((l) => /^\s*snapshot\)\s*$/.test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*;;\s*$/.test(lines[i])) { end = i; break; }
  }
  const branch = lines.slice(start, end).join('\n');
  const re = new RegExp(escapeRe(basename) + '\\s+([a-z][a-z0-9_-]*)', 'g');
  const seen = [];
  let m;
  while ((m = re.exec(branch)) !== null) seen.push(m[1]);
  return seen.length ? seen[seen.length - 1] : null;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---- THE CHECK ---------------------------------------------------------------------------------

function run(opts) {
  const results = [];
  const add = (id, ok, detail) => results.push({ id, ok, detail });

  const scriptName = path.basename(opts.script);
  const resetName = path.basename(opts.reset);

  if (!fs.existsSync(opts.script)) {
    add('R0', false, 'the script under check does not exist: ' + opts.script);
    return results;
  }
  const text = fs.readFileSync(opts.script, 'utf8');
  const lines = text.split('\n');

  const header = headerBlock(lines);
  const banner = lastHeredoc(lines);

  add('R0', header.length > 0 && banner !== null,
    'header ' + header.length + ' comment lines; banner '
      + (banner ? 'heredoc lines ' + (banner.from + 1) + '-' + banner.to : 'NOT FOUND (no closing heredoc)'));
  if (!banner || !header.length) return results;

  const headerText = header.join('\n');
  const bannerText = banner.body.join('\n');
  const resetPresent = fs.existsSync(opts.reset);
  const namesReset = (s) => s.includes(resetName);

  // R7 first: with no reset script, naming it is the contradiction, and R1/R2/R4/R5/R6 are moot.
  if (!resetPresent) {
    const named = namesReset(headerText) || namesReset(bannerText);
    add('R7', !named,
      named
        ? resetName + ' does not exist, yet ' + scriptName + ' still prints a recipe that calls it '
          + '(header: ' + namesReset(headerText) + ', banner: ' + namesReset(bannerText) + ')'
        : resetName + ' is absent and ' + scriptName + ' does not claim it — consistent');
    return results;
  }
  add('R7', true, resetName + ' exists, so the text is required to know it (R1-R6 below)');

  add('R1', namesReset(headerText),
    namesReset(headerText)
      ? 'the header names ' + resetName
      : 'the header of ' + scriptName + ' never names ' + resetName + ', which exists — this is the '
        + 'shape that told a reader a live world cannot be reset');

  add('R2', namesReset(bannerText),
    namesReset(bannerText)
      ? 'the closing banner names ' + resetName
      : 'the CLOSING BANNER — the last text on the terminal — never names ' + resetName + ', which exists');

  const selfNamed = banner.body
    .map((l, i) => ({ n: banner.from + 1 + i, l }))
    .filter((r) => r.l.includes(scriptName) || /(^|[^\w$])\$0([^\w]|$)/.test(r.l));
  add('R3', selfNamed.length === 0,
    selfNamed.length === 0
      ? 'the banner never tells the reader to run ' + scriptName + ' again'
      : 'the banner recommends rebuilding the world ' + selfNamed.length + ' time(s): line(s) '
        + selfNamed.map((r) => r.n).join(', '));

  const verbs = implementedVerbs(fs.readFileSync(opts.reset, 'utf8'));
  const resetText = fs.readFileSync(opts.reset, 'utf8');
  const vars = readVariables(resetText);

  if (!verbs) {
    add('R4', false, 'could not parse a `case "$COMMAND" in` block out of ' + resetName
      + ' — failing closed rather than accepting any verb');
  } else {
    const re = new RegExp(escapeRe(resetName) + '\\s+([a-z][a-z0-9_-]*)', 'g');
    const used = [];
    let m;
    while ((m = re.exec(text)) !== null) used.push(m[1]);
    const bad = used.filter((v) => !verbs.includes(v));
    add('R4', bad.length === 0,
      bad.length === 0
        ? scriptName + ' names verb(s) [' + [...new Set(used)].join(', ') + ']; ' + resetName
          + ' implements [' + verbs.join(', ') + ']'
        : scriptName + ' calls ' + resetName + ' with verb(s) it does not implement: [' + [...new Set(bad)].join(', ')
          + ']; implemented: [' + verbs.join(', ') + ']');
  }

  const invocations = logicalLines(lines).filter((l) => l.includes(resetName));
  const passedVars = new Set();
  invocations.forEach((l) => {
    const re = /(^|\s)([A-Z][A-Z0-9_]*)=/g;
    let m;
    while ((m = re.exec(l)) !== null) passedVars.add(m[2]);
  });
  const unknownVars = [...passedVars].filter((v) => !vars.has(v));
  add('R5', unknownVars.length === 0,
    unknownVars.length === 0
      ? 'every variable handed to ' + resetName + ' [' + ([...passedVars].join(', ') || 'none')
        + '] is one it reads'
      : scriptName + ' passes variable(s) ' + resetName + ' does not read: [' + unknownVars.join(', ')
        + ']; it reads [' + [...vars].join(', ') + ']');

  if (verbs) {
    const re = new RegExp(escapeRe(resetName) + '\\s+([a-z][a-z0-9_-]*)', 'g');
    const inBanner = [];
    let m;
    while ((m = re.exec(bannerText)) !== null) inBanner.push(m[1]);
    const runnable = inBanner.filter((v) => verbs.includes(v));
    const between = advertisedBetweenVerb(resetText, resetName);
    if (between) {
      const ok = runnable.length > 0 && inBanner.includes(between);
      add('R6', ok,
        ok
          ? 'the banner offers a runnable reset [' + [...new Set(runnable)].join(', ')
            + '] including `' + between + '`, the between-journeys verb ' + resetName + ' advertises itself'
          : 'the banner offers [' + (inBanner.join(', ') || 'no invocation at all') + ']; ' + resetName
            + ' advertises `' + between + '` as the between-journeys step and the banner must print it');
    } else {
      add('R6', runnable.length > 0,
        (runnable.length > 0 ? 'the banner offers a runnable reset [' + [...new Set(runnable)].join(', ') + ']'
          : 'the banner names ' + resetName + ' but never invokes it with an implemented verb')
        + ' — NOTE: ' + resetName + "'s snapshot branch no longer prints a recipe, so the between-journeys "
        + 'verb could not be derived and R6 checked the weaker property');
    }
  }

  return results;
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exit(2); }

  console.log('live-world banner check');
  console.log('  script : ' + opts.script);
  console.log('  reset  : ' + opts.reset + (fs.existsSync(opts.reset) ? '' : '   (ABSENT)'));
  console.log('');

  const results = run(opts);
  results.forEach((r) => {
    console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.id + '  ' + r.detail);
  });

  const failed = results.filter((r) => !r.ok);
  console.log('');
  if (failed.length) {
    console.log('FAILED ' + failed.length + '/' + results.length
      + ' — live-world.sh and live-world-reset.sh contradict each other.');
    process.exit(1);
  }
  console.log('OK ' + results.length + '/' + results.length
    + ' — the script an operator runs describes the reset that exists.');
}

if (require.main === module) main();

module.exports = { run, headerBlock, lastHeredoc, logicalLines, implementedVerbs, readVariables };
