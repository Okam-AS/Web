// CAN THIS JOURNEY BE RUN A SECOND TIME?
//
// Two properties decide it, and neither of them ever shows up as a failure on the run that breaks
// them. A journey that holds both can be pointed at a world that keeps what the last run wrote; a
// journey that holds neither works exactly once, against a world somebody has just reset, and reads
// as green evidence the whole time.
//
//   A WRITTEN-DOWN DATE IS NOT A PASSING ASSERTION, IT IS A COUNTDOWN.
//     `events-enquiry-to-settlement` drafted its offer with `expiryDay: '2026-11-30'`. Both the
//     fixture and `EventsProposalService` refuse to SEND a proposal whose expiry is not in the
//     future, so that journey was scheduled to turn red on 30 November 2026 — everywhere, in one
//     step, on a day nobody changed anything, in a suite everybody trusts. The first instinct will
//     be to hunt a regression in Events, and there is none to find. Two dates of exactly this shape
//     have already gone past in this tree unnoticed (`2026-08-01T08:00` in margin-supplier-to-plate,
//     `2026-08-03T09:00` in meals-admin-setup); they were harmless only by luck of what they feed.
//
//   A CONSTANT SUBJECT NAME MAKES A JOURNEY FIND SOMEBODY ELSE'S ROW.
//     The same journey found its booking by the constant «Nina Nordmann». On a freshly reset fixture
//     that is one row. On any world that keeps the previous run's writes it is two, and the walk
//     either fails on `toHaveCount(1)` or — worse, had it been written with `.first()` — proceeds
//     against whichever row it happened to pick. A journey that only works once against a fresh
//     world is a fixture test wearing a live journey's name.
//
// ---- WHY THIS IS NOT KEYED TO `2026-11-30` OR TO «NINA NORDMANN» -------------------------------
//
// A rule keyed to the literal that was found catches that literal and nothing else, and the next one
// will not be spelled the same. So neither of the two strings above appears in any assertion here.
// What is checked is the SHAPE: any `YYYY-MM-DD` written into executable code, and any subject value
// that comes out the same twice.
//
// The subject half is checked BY RUNNING IT rather than by reading it. Each registered spec's own
// declarations — its run token, its date helper and its subject objects — are lifted out and
// evaluated TWICE in this process, and the values a locator searches by must differ between the two
// evaluations. A spec whose naming path was quietly reverted to a constant produces two equal
// strings and reds, whatever the constant happens to be.
//
// ---- WHAT THIS GUARD CAN SEE, AND WHAT IT CANNOT -----------------------------------------------
//
// CAN:
//   • a `YYYY-MM-DD` literal in the executable code of any journey spec, in any tense;
//   • a registered spec whose subject name, address, occasion or invoice reference is the same on
//     two evaluations of the spec's own naming path;
//   • a registered spec whose row locator searches by a bare string, whether that string is English,
//     Norwegian or anything else — the rule is the SHAPE of the argument, not its vocabulary;
//   • a registered spec that stopped declaring a run token at all;
//   • the two Events specs drifting into two different spellings of the same convention.
//
// CANNOT:
//   • a date assembled at runtime — `'2026-' + '11-30'`, `new Date(1793404800000)`, a day read from
//     an env var. Nothing static can, and a journey that wanted to smuggle one still could.
//   • a countdown living in the FIXTURE WORLD rather than in a spec. `test/e2e/fixture/world.js`
//     holds several: the seeded open proposal expires `2026-11-30T22:59:59Z` and both Meals
//     invitations expire `2026-12-31T22:59:59Z`, and the Meals ones do gate a journey. They are out
//     of this file's scope on purpose — the fixture is another lane's subject and reddening it here
//     would be this guard making a judgement it was not asked for — and they are named so the next
//     reader does not have to find them again.
//   • a subject tagged under a name other than `RUN`. The derived half below picks specs up by that
//     declaration, so a new journey that invents `const TAG = …` is outside the rule until somebody
//     registers it. That is the cost of having a convention at all, and it is why the registry is
//     explicit as well as derived.
//   • whether a journey can run live AT ALL. `events-enquiry-to-settlement` still pins the fixture's
//     store 42 and still carries `@fixture`; those are named in its own header and are not this
//     file's subject.
//
// ---- WHY THE COMMENTS ARE BLANKED FIRST, AND WHY THAT IS CHECKED -------------------------------
//
// Each spec now QUOTES the literal it replaced, verbatim, so the reader of the diff can see what
// changed. A scan over the raw text would find those quotations and report the defect as still
// present — matching a string rather than the thing the string describes, which is the same mistake
// one level up. What is scanned is what executes. The blanker is regex-literal aware because these
// specs contain `/Navigation cancelled from "\/admin\?redirect=/i`, whose lone double quote would
// send a naive string skipper past the end of the file and leave this guard reading a corpus it had
// silently stopped parsing; that is asserted below rather than assumed.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const JOURNEY_DIR = path.join(REPO_ROOT, 'test', 'e2e', 'journeys');

// ---- the registry -------------------------------------------------------------------------------
//
// The specs that CLAIM to be re-runnable. Named rather than derived, because the derived half below
// picks a spec up by the very declaration a regression would delete: a rule that only knew how to
// find tagged specs would stop covering one the moment somebody untagged it, which is precisely the
// change it exists to refuse.
const REGISTERED = [
  {
    file: 'events-enquiry-to-settlement.spec.js',
    // The names of the declarations this spec's naming path is made of, IN THE ORDER THEY MUST BE
    // EVALUATED. Every value a later step searches by comes out of these four.
    declarations: ['RUN', 'daysFromNow', 'GUEST', 'OFFER', 'INVOICE'],
    // Values that must differ between two runs, as `<object>.<property>`.
    perRun: ['GUEST.name', 'GUEST.email', 'GUEST.occasion', 'INVOICE.reference'],
    // Values that must be a day in the future, derived rather than written.
    futureDays: ['GUEST.date', 'OFFER.expiryDay'],
    // `hasText:` arguments that are STRING LITERALS, each with what it is. A row is never located by
    // one of these; they match copy on a panel the walk has already opened. Anything not listed reds,
    // which is what catches a subject name being written back in as a literal.
    copyLiterals: {
      'Oppgjør': 'the settlement panel\'s own heading, inside a booking this walk already opened'
    }
  },
  {
    file: 'events-guest-proposal.spec.js',
    declarations: ['RUN', 'daysFromNow', 'GUEST', 'OFFER'],
    perRun: ['GUEST.name', 'GUEST.email', 'GUEST.occasion'],
    futureDays: ['GUEST.date', 'OFFER.expiryDay'],
    copyLiterals: {}
  }
];

// ---- the ledger ---------------------------------------------------------------------------------
//
// Date literals that are STILL IN THE FUTURE somewhere in the journey tree, and therefore still
// counting down. This is a ledger, not an allowlist: each entry names the file, the literal and what
// it feeds, and each is checked below to still BE there — so a literal that gets fixed and left in
// this list reds, and the list cannot rot into a set of names nobody can account for.
//
// A registered spec may never appear here. Buying an exemption is the one thing this file exists to
// stop.
const KNOWN_COUNTDOWNS = [
  {
    file: 'training-course-to-evidence.spec.js',
    literal: '2026-08-15',
    why: 'the due date typed into an assignment, and repeated in that step\'s detail string. It goes ' +
      'past on 15 August 2026, after which the walk assigns a course that is already overdue. ' +
      'Training\'s lane, not this one\'s — recorded so the day it changes meaning is written down ' +
      'somewhere before it arrives.'
  }
];

// ---- reading the corpus -------------------------------------------------------------------------

/**
 * Blank every comment, preserving every offset, every string literal and every regex literal.
 *
 * Offsets are preserved so that a line number computed from an index is the line number in the file
 * a reader will open. The regex arm is not decoration: see the header.
 */
function blankComments (src) {
  const out = src.split('');
  // The last significant character seen. A `/` after one of `)]}` or an identifier is a DIVISION; a
  // `/` anywhere else is the start of a regex literal. That is the standard disambiguation and it is
  // enough for this corpus, which divides in exactly one place (`sites.length / 3` is not in it).
  let previous = '';
  let i = 0;
  const skipString = (quote) => {
    i++;
    while (i < src.length) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === quote) { i++; return; }
      i++;
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { skipString(c); previous = c; continue; }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') { out[i] = ' '; }
        i++;
      }
      out[i] = ' '; out[i + 1] = ' ';
      i += 2;
      continue;
    }
    if (c === '/' && !/[A-Za-z0-9_)\]}]/.test(previous)) {
      // A regex literal. Skipped whole, character class aware, so a `/` inside `[^/]` does not end it
      // and a quote inside it does not start a string.
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') { inClass = true; } else if (src[i] === ']') { inClass = false; } else if (src[i] === '/' && !inClass) { i++; break; } else if (src[i] === '\n') { break; }
        i++;
      }
      previous = '/';
      continue;
    }
    if (!/\s/.test(c)) { previous = c; }
    i++;
  }
  return out.join('');
}

function specFiles (dir, found) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { specFiles(full, found); } else if (entry.name.endsWith('.spec.js')) { found.push(full); }
  }
  return found;
}

const specs = specFiles(JOURNEY_DIR, []).sort().map((full) => {
  const raw = fs.readFileSync(full, 'utf8');
  return { name: path.basename(full), rel: path.relative(REPO_ROOT, full), raw, code: blankComments(raw) };
});

const byName = new Map(specs.map(s => [s.name, s]));

function lineOf (code, index) {
  return code.slice(0, index).split('\n').length;
}

const DATE_LITERAL = /\d{4}-\d{2}-\d{2}/g;

function datesIn (spec) {
  const found = [];
  DATE_LITERAL.lastIndex = 0;
  let hit;
  while ((hit = DATE_LITERAL.exec(spec.code)) !== null) {
    found.push({ spec: spec.name, rel: spec.rel, line: lineOf(spec.code, hit.index), literal: hit[0] });
  }
  return found;
}

const allDates = specs.flatMap(datesIn);

// TODAY, as the same `YYYY-MM-DD` string the literals are written in — so the comparison is a string
// comparison over a format that sorts lexicographically, with no parsing and no zone.
const TODAY = new Date().toISOString().slice(0, 10);
const stillCounting = allDates.filter(d => d.literal > TODAY);

// ---- lifting a spec's own naming path out of it -------------------------------------------------

/**
 * The text of one top-level declaration, `const NAME = …;` or `function NAME (…) {…}`.
 *
 * Returns null when the declaration is absent, and THROWS when it is present but unterminated —
 * the difference between "this spec does not have one" (a finding) and "this reader lost its place"
 * (a broken guard reporting a finding it did not earn).
 */
function declarationOf (code, name) {
  const constAt = code.search(new RegExp('^const ' + name + ' =', 'm'));
  const funcAt = code.search(new RegExp('^function ' + name + ' ?\\(', 'm'));
  const start = constAt >= 0 ? constAt : funcAt;
  if (start < 0) { return null; }
  const isFunction = constAt < 0;
  let depth = 0;
  let braces = 0;
  let openedBody = false;
  let i = start;
  while (i < code.length) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      depth++;
      if (c === '{') { braces++; openedBody = true; }
      i++;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (c === '}') { braces--; }
      i++;
      // A function declaration ends at the `}` that closes its BODY — not at the `)` that closes its
      // parameter list, which is the off-by-one that would hand back `function f (days)` and make
      // every evaluation below a syntax error rather than a finding.
      if (isFunction && openedBody && braces === 0) { return code.slice(start, i); }
      continue;
    }
    if (c === ';' && depth === 0 && !isFunction) { return code.slice(start, i + 1); }
    i++;
  }
  throw new Error('UNTERMINATED DECLARATION: `' + name + '` starts at index ' + start +
    ' and this reader never found its end. Nothing was judged from a source it could not parse.');
}

/**
 * Evaluates a spec's OWN declarations, in this process, and hands back what they produced.
 *
 * This is the whole reason the subject half of the guard can fail: it does not read the spec's
 * intentions, it runs the spec's naming path and looks at what came out. Two calls are two
 * invocations of that path, which is the closest thing to a second live run that can be had without
 * a world.
 */
function invokeNamingPath (spec, declarations) {
  const parts = declarations.map((name) => {
    const text = declarationOf(spec.code, name);
    if (text === null) {
      throw new Error('MISSING DECLARATION: ' + spec.rel + ' declares no top-level `' + name +
        '`. A registered journey names its subject through these declarations, so one that is gone ' +
        'is a naming path this guard can no longer run — not an absence of findings.');
    }
    return text;
  });
  // eslint-disable-next-line no-new-func
  return new Function(parts.join('\n') + '\nreturn { ' + declarations.join(', ') + ' };')();
}

function valueAt (subject, dotted) {
  return dotted.split('.').reduce((node, key) => (node === undefined || node === null ? node : node[key]), subject);
}

// ---- `hasText:` arguments, classified ------------------------------------------------------------

const HAS_TEXT = /hasText:\s*([^,}]+)/g;

/** Every `hasText:` argument in a spec, as written, with its line. */
function hasTextArguments (spec) {
  const found = [];
  HAS_TEXT.lastIndex = 0;
  let hit;
  while ((hit = HAS_TEXT.exec(spec.code)) !== null) {
    found.push({ line: lineOf(spec.code, hit.index), expression: hit[1].trim() });
  }
  return found;
}

const STRING_LITERAL = /^'((?:\\.|[^'\\])*)'$|^"((?:\\.|[^"\\])*)"$/;
const MEMBER = /^[A-Z][A-Za-z0-9_]*\.[A-Za-z0-9_]+$/;

// ---- the guard examined what it claims to have examined ------------------------------------------

describe('the guard read what it says it read', () => {
  test('the walk reached the journey tree, and both registered specs are in it', () => {
    expect(specs.length).toBeGreaterThan(0);
    for (const entry of REGISTERED) {
      expect(byName.has(entry.file)).toBe(true);
    }
    // REACHABILITY PIN for the ledger: a ledger entry about a file this walk never opens would be a
    // claim nothing checks.
    for (const entry of KNOWN_COUNTDOWNS) {
      expect(byName.has(entry.file)).toBe(true);
    }
  });

  test('blanking preserved every offset, in every spec', () => {
    // A blanker that dropped text would shift every line number this guard reports and could shrink
    // the corpus without saying so.
    const shifted = specs.filter(s => s.code.length !== s.raw.length).map(s => s.rel);
    expect(shifted).toEqual([]);
  });

  test('blanking removed the prose and kept the code, in the spec that quotes its own defect', () => {
    const spec = byName.get('events-enquiry-to-settlement.spec.js');
    // The header quotes the literal it replaced. A raw scan finds it; the blanked code must not.
    expect(spec.raw).toContain('2026-11-30');
    expect(spec.code).not.toContain('2026-11-30');
    // …and the code around it survived: the draft still computes its expiry, and the subject object
    // is still readable.
    expect(spec.code).toContain('expiryDay: daysFromNow(');
    expect(spec.code).toContain('const GUEST = {');
  });

  test('every comment-only line in every spec came out blank', () => {
    // THE IDENTITY THAT MAKES THE BLANKER CHECKABLE OVER THE WHOLE CORPUS, and it is the one that
    // catches a scanner which lost its place: a runaway string swallows everything after it, so the
    // comments BEYOND that point come through untouched. Asserted per line and reported per file, so
    // a scanner that goes wrong in one spec reds on that spec by name rather than shrinking the
    // corpus by one.
    const escaped = [];
    for (const spec of specs) {
      const raw = spec.raw.split('\n');
      const code = spec.code.split('\n');
      raw.forEach((line, index) => {
        if (/^\s*\/\//.test(line) && code[index].trim() !== '') {
          escaped.push(spec.rel + ':' + (index + 1) + '  ' + code[index].trim().slice(0, 60));
        }
      });
    }
    expect(escaped).toEqual([]);
  });

  test('the blanker survives a regex literal carrying a quote — the shape this corpus contains', () => {
    // `/Navigation cancelled from "\/admin\?redirect=/i` is in two of these specs: ONE double quote,
    // inside a regex. A blanker that took it for the start of a string would swallow the rest of the
    // file, and every assertion downstream would be examining nothing while reporting success.
    //
    // Handed the wrong answer directly rather than inferred from the corpus, because in the file
    // where that regex lives there is no comment AFTER it — so the corpus cannot demonstrate the
    // hazard even though it carries it, and a check that only read the corpus would pass on a
    // regex-blind blanker. That is exactly what happened to the first version of this test.
    const hazard = 'const re = /from "\\/admin\\?x=/i;\nconst keep = 1; // must be blanked\n';
    expect(blankComments(hazard)).toContain('const keep = 1;');
    expect(blankComments(hazard)).not.toContain('must be blanked');
    // The corpus really does contain the hazard, so the sample above is about this tree and not
    // about an imagined one.
    expect(specs.filter(s => /\/[^\n]*"[^\n]*\/[a-z]*;/.test(s.raw)).length).toBeGreaterThan(0);
  });

  test('the blanker tells a division from a regex, and a comment inside a string from a comment', () => {
    // The other half of the disambiguation. Getting this wrong the other way — reading `a / b` as the
    // start of a regex — eats code rather than comments, and a guard reading a shorter file finds
    // fewer defects while reporting success just as loudly.
    const division = 'const half = total / 2; // vanishes\nconst kept = 3;\n';
    expect(blankComments(division)).toContain('const half = total / 2;');
    expect(blankComments(division)).toContain('const kept = 3;');
    expect(blankComments(division)).not.toContain('vanishes');
    expect(blankComments(division)).toHaveLength(division.length);

    const inString = "const url = 'https://x/y'; // vanishes\nconst kept = 3;\n";
    expect(blankComments(inString)).toContain("const url = 'https://x/y';");
    expect(blankComments(inString)).toContain('const kept = 3;');
    expect(blankComments(inString)).not.toContain('vanishes');

    // A block comment is blanked to spaces, newlines kept, so every offset downstream is unmoved.
    expect(blankComments('/* a */const kept = 3;\n')).toBe('       const kept = 3;\n');
  });

  test('every date literal found is attributed to a file and a line', () => {
    const unattributed = allDates.filter(d => !d.spec || !d.line);
    expect(unattributed).toEqual([]);
    // The corpus is not empty of dates, which is what makes the rules below about something. If this
    // ever legitimately reaches zero, the ledger empties with it and this line is the one to delete.
    expect(allDates.length).toBeGreaterThan(0);
  });
});

describe('no journey spec carries a date that has not happened yet', () => {
  test('every date literal still in the future is in the ledger, with a reason', () => {
    const ledgered = new Set(KNOWN_COUNTDOWNS.map(k => k.file + '|' + k.literal));
    const unaccounted = stillCounting
      .filter(d => !ledgered.has(d.spec + '|' + d.literal))
      .map(d => d.rel + ':' + d.line + '  ' + d.literal +
        '  — a date that has not arrived. Derive it from the run\'s clock, or add it to ' +
        'KNOWN_COUNTDOWNS in this file with what it feeds and when it stops being true.');
    expect(unaccounted).toEqual([]);
  });

  test('every ledger entry still names a literal that is really there', () => {
    const present = new Set(allDates.map(d => d.spec + '|' + d.literal));
    const stale = KNOWN_COUNTDOWNS
      .filter(k => !present.has(k.file + '|' + k.literal))
      .map(k => k.file + ' no longer carries ' + k.literal + ' — remove the ledger entry.');
    expect(stale).toEqual([]);
    for (const entry of KNOWN_COUNTDOWNS) {
      expect(entry.why.length).toBeGreaterThan(40);
    }
  });

  test('a registered journey cannot buy an exemption', () => {
    const registered = new Set(REGISTERED.map(r => r.file));
    expect(KNOWN_COUNTDOWNS.filter(k => registered.has(k.file))).toEqual([]);
  });
});

describe.each(REGISTERED.map(r => [r.file, r]))('%s is re-runnable', (file, entry) => {
  const spec = byName.get(file);

  test('carries no written-down calendar date at all, in any tense', () => {
    // Not «no FUTURE date»: a past one in a journey that creates its own world is a fixture coupling
    // waiting to become a countdown the next time somebody bumps it forward a year.
    const written = datesIn(spec).map(d => d.rel + ':' + d.line + '  ' + d.literal);
    expect(written).toEqual([]);
  });

  test('declares a run token, and two invocations of its own naming path disagree', () => {
    const first = invokeNamingPath(spec, entry.declarations);
    const second = invokeNamingPath(spec, entry.declarations);
    expect(typeof first.RUN).toBe('string');
    expect(first.RUN.length).toBeGreaterThan(6);
    expect(second.RUN).not.toBe(first.RUN);
  });

  test.each(entry.perRun)('%s is different on a second run', (dotted) => {
    const first = valueAt(invokeNamingPath(spec, entry.declarations), dotted);
    const second = valueAt(invokeNamingPath(spec, entry.declarations), dotted);
    expect(typeof first).toBe('string');
    expect(first.length).toBeGreaterThan(0);
    expect(second).not.toBe(first);
  });

  test.each(entry.futureDays)('%s is a day derived from the clock, and it is ahead of today', (dotted) => {
    const day = valueAt(invokeNamingPath(spec, entry.declarations), dotted);
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // True today and true in ten years, BECAUSE it is derived. A literal that satisfied this on the
    // day it was written would be caught by the rule above rather than by this one; the two point at
    // the same defect from opposite directions on purpose.
    expect(day > TODAY).toBe(true);
  });

  test('every hasText: argument is either a per-run subject or recorded copy', () => {
    const problems = [];
    const subject = invokeNamingPath(spec, entry.declarations);
    const twin = invokeNamingPath(spec, entry.declarations);
    for (const argument of hasTextArguments(spec)) {
      const literal = STRING_LITERAL.exec(argument.expression);
      if (literal) {
        const text = literal[1] !== undefined ? literal[1] : literal[2];
        if (!Object.prototype.hasOwnProperty.call(entry.copyLiterals, text)) {
          problems.push(spec.rel + ':' + argument.line + '  searches by the bare string «' + text +
            '». If it is a subject this walk created, tag it per run; if it is copy on a panel, ' +
            'record it in copyLiterals with what it is.');
        }
        continue;
      }
      if (MEMBER.test(argument.expression)) {
        const a = valueAt(subject, argument.expression);
        const b = valueAt(twin, argument.expression);
        if (a === undefined || a === null) {
          problems.push(spec.rel + ':' + argument.line + '  searches by `' + argument.expression +
            '`, which this guard could not resolve out of the spec\'s own declarations.');
        } else if (a === b) {
          problems.push(spec.rel + ':' + argument.line + '  searches by `' + argument.expression +
            '`, which is the SAME on two runs («' + a + '»). A second run against a world that kept ' +
            'the first one\'s writes finds two of these.');
        }
        continue;
      }
      problems.push(spec.rel + ':' + argument.line + '  searches by `' + argument.expression +
        '`, a shape this guard cannot judge. Locate by a per-run subject value, or record it.');
    }
    expect(problems).toEqual([]);
  });

  test('the recorded copy strings are all actually used', () => {
    // An entry nobody matches is an exemption sitting in the file waiting to excuse something else.
    const used = new Set(hasTextArguments(spec)
      .map(a => STRING_LITERAL.exec(a.expression))
      .filter(Boolean)
      .map(m => (m[1] !== undefined ? m[1] : m[2])));
    const unused = Object.keys(entry.copyLiterals).filter(text => !used.has(text));
    expect(unused).toEqual([]);
  });
});

describe('the Events family names its subjects one way, not two', () => {
  // Two journeys tagging their subjects differently is the predicate collision this estate keeps
  // paying for, in test clothing. Both files are held to ONE spelling — so a change to the
  // convention has to be made in both places at once, which is the only way a convention survives.
  const declarations = ['RUN', 'daysFromNow'];

  test.each(declarations)('both Events specs declare `%s` identically', (name) => {
    const texts = REGISTERED.map(entry => ({
      file: entry.file,
      text: declarationOf(byName.get(entry.file).code, name)
    }));
    for (const one of texts) {
      expect(one.text).not.toBeNull();
    }
    const distinct = new Set(texts.map(t => t.text.replace(/\s+/g, ' ').trim()));
    expect(Array.from(distinct)).toHaveLength(1);
  });
});

describe('the derived half: a spec that claims the convention is held to it', () => {
  // The registry above is the remembered fact and it is the one a regression would delete. This is
  // the other direction: any spec that declares the convention's token is covered whether or not
  // anybody remembered to register it, so a NEW journey is protected by writing `const RUN =` and
  // nothing else.
  const claiming = specs.filter(s => /^const RUN =/m.test(s.code)).map(s => s.name);

  test('every spec declaring a run token is registered, or explains itself', () => {
    const registered = new Set(REGISTERED.map(r => r.file));
    const unregistered = claiming.filter(name => !registered.has(name)).map(name => name +
      ' declares `const RUN =` — the per-run subject convention — but is not in REGISTERED, so ' +
      'nothing checks that its subjects actually differ between runs. Register it.');
    expect(unregistered).toEqual([]);
  });

  test('and every registered spec really does declare one', () => {
    // The pair of the above. Together they are an equality rather than two containments, which is
    // what stops the registry and the corpus drifting apart in either direction.
    expect(claiming.slice().sort()).toEqual(REGISTERED.map(r => r.file).sort());
  });
});
