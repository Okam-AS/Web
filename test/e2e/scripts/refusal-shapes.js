//
// WHAT A REFUSAL SHAPE IS, AND WHY BOTH SIDES ARE DERIVED
//
// A fixture is a CLAIM ABOUT A BACKEND, and nothing checked the claim. Twice in one day the e2e
// fixture was found a release behind the API it stands in for. The clearest instance: the newsletter
// test-send guard checked address equality but not the confirmation flag that had just landed, and it
// answered `400 growth.test_address_not_own` where the backend answers `403`. A journey walking that
// screen would have run against a world that never refused anything — an assertion that cannot fail.
//
// A REFUSAL SHAPE is the pair a caller can actually observe: `(http status, stable error code)` on a
// named route. It is the right unit precisely because it caught that instance — the code was already
// there; the STATUS was a release old. Comparing codes alone would have passed.
//
// Both sides of the comparison are derived from source, and neither side is a list anybody maintains:
//
//   the backend  every module renders refusals through ONE typed exception whose static factories fix
//                the status (`GrowthApiException.Conflict(code, …)` is always 409). That table is read
//                out of the exception class itself, so adding a factory extends this check with no
//                edit here. Routes come from `[Route]` + `[HttpGet/Post/…]` attributes; a route's
//                refusals are the ones reachable from its action through the module's own methods.
//
//   the fixture  a refusal primitive is any function whose PARAMETER LIST names both `status` and
//                `code` — `growthError(ctx, status, code, message)`, `problem(res, status, code, …)`,
//                the `ctx.problem` bound in api-server.js. Same trick `test/core-request-path-shape`
//                uses on `RequestService`: the convention is read off the signature rather than
//                remembered, so a new refusal helper is covered because it is shaped like one.
//
// THE ONE THING THAT IS WRITTEN DOWN is which backend route a fixture handler stands in for
// (`// @backend POST /v1/growth/…`). That is a MAPPING, not a refusal list: it does not go stale when
// a refusal is added on either side, which is the failure mode this check exists to stop. Everything
// judged is derived from the two bodies of code.
//
// FAIL-CLOSED, WHICH IS WHY THE DECLARATIONS ARE SAFE. A fixture may declare a backend refusal it
// deliberately does not model (`// @backend-unmodelled 401 growth.unattributed — …`). Forgetting to
// declare one makes this check RED, never green; and a declaration the backend no longer emits is
// itself reported, so the exemptions cannot quietly outlive their reason.
//
// WHAT THIS FILE IS NOT: it is not a diff. Two files that differ in prose, message text, ordering,
// helper names, response bodies or anything else that is not an observable (status, code) pair on an
// anchored route are IDENTICAL to it. A guard that reds whenever two files differ is a diff, and
// people stop reading it.
//

'use strict';

const fs = require('fs');
const path = require('path');

// ---- shared lexing -----------------------------------------------------------------------------

/**
 * Blank every comment while preserving offsets and string literals, so that prose naming
 * `growthError(...)` is not scanned as if it were code and a `//` inside a URL is not scanned as if
 * it were a comment. Offsets survive, so annotations read off the RAW text still line up with the
 * blanked text used for code scanning.
 *
 * `verbatim` handles C#'s `@"..."` (where `\` is not an escape and `""` is a quote).
 */
function blankComments (src, { verbatim = false } = {}) {
  const out = src.split('');
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (verbatim && c === '@' && src[i + 1] === '"') {
      i += 2;
      while (i < src.length) {
        if (src[i] === '"' && src[i + 1] === '"') { i += 2; continue; }
        if (src[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '"' || c === "'" || (!verbatim && c === '`')) {
      const quote = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
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
    i++;
  }
  return out.join('');
}

/**
 * The comma-separated arguments of the call whose `(` is at `open`, as written. Returns null when the
 * call never closes — a scanner that has lost its place must say so rather than report a smaller
 * corpus.
 */
function callArguments (src, open, { verbatim = false } = {}) {
  let depth = 0;
  const parts = [];
  let start = open + 1;
  let i = open;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < src.length) {
        if (!verbatim && src[i] === '\\') { i += 2; continue; }
        if (verbatim && src[i] === '"' && src[i + 1] === '"') { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') { depth++; i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0) { parts.push(src.slice(start, i)); return parts.map(p => p.trim()); }
      i++;
      continue;
    }
    if (c === ',' && depth === 1) { parts.push(src.slice(start, i)); start = i + 1; i++; continue; }
    i++;
  }
  return null;
}

/** The `{ … }` block that starts at or after `from`, brace-matched. Null when it never closes. */
function blockAt (src, from) {
  let i = from;
  let parens = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '(') { parens++; i++; continue; }
    if (c === ')') { parens--; i++; continue; }
    if (c === '{' && parens === 0) { break; }
    if (c === ';' && parens === 0) { return null; }
    i++;
  }
  if (i >= src.length) { return null; }
  let depth = 0;
  let k = i;
  while (k < src.length) {
    const c = src[k];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      k++;
      while (k < src.length) {
        if (src[k] === '\\') { k += 2; continue; }
        if (src[k] === quote) { k++; break; }
        k++;
      }
      continue;
    }
    if (c === '{') { depth++; } else if (c === '}') {
      depth--;
      if (depth === 0) { return { start: i, end: k + 1, text: src.slice(i, k + 1) }; }
    }
    k++;
  }
  return null;
}

function lineOf (src, index) {
  return src.slice(0, index).split('\n').length;
}

function unquote (expression) {
  const text = String(expression).trim();
  if (text.startsWith('"')) {
    try { return JSON.parse(text); } catch (error) { return null; }
  }
  if (text.startsWith("'")) {
    const inner = /^'((?:\\.|[^'\\])*)'$/.exec(text);
    return inner ? inner[1].replace(/\\(.)/g, '$1') : null;
  }
  return null;
}

function shape (status, code) {
  return String(status) + ' ' + String(code);
}

// ---- the backend side --------------------------------------------------------------------------

const CSHARP_KEYWORD_CALLS = new Set([
  'if', 'while', 'for', 'foreach', 'switch', 'catch', 'using', 'lock', 'return', 'throw', 'do',
  'else', 'nameof', 'typeof', 'sizeof', 'default', 'checked', 'unchecked', 'fixed', 'await', 'when',
  'is', 'as', 'new', 'get', 'set'
]);

function csharpFiles (root, out) {
  if (!fs.existsSync(root)) { return out; }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'obj' || entry.name === 'bin') { continue; }
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) { csharpFiles(full, out); } else if (entry.name.endsWith('.cs')) { out.push(full); }
  }
  return out;
}

/**
 * The status a typed exception class fixes for each of its static factories, read out of the class
 * itself. `Conflict(code, message) => new GrowthApiException(code, 409, message)` yields
 * `{ status: 409, code: '$code' }`; `NotFound() => new …("growth.not_found", 404, …)` yields the
 * literal pair. Nothing here is remembered — a new factory is picked up because it is a factory.
 */
function exceptionFactories (source, className) {
  const src = blankComments(source, { verbatim: true });
  const table = {};

  // The constructor's parameter order, so `new XException(code, status, detail)` can be read too.
  let ctorCodeAt = 0;
  let ctorStatusAt = 1;
  const ctor = new RegExp('public\\s+' + className + '\\s*\\(([^)]*)\\)').exec(src);
  if (ctor) {
    const names = ctor[1].split(',').map(p => p.trim().split(/\s+/).pop());
    const codeIndex = names.findIndex(n => /^code$/i.test(n));
    const statusIndex = names.findIndex(n => /^status(Code)?$/i.test(n));
    if (codeIndex >= 0) { ctorCodeAt = codeIndex; }
    if (statusIndex >= 0) { ctorStatusAt = statusIndex; }
  }

  const factory = new RegExp(
    'public\\s+static\\s+' + className + '\\s+([A-Za-z0-9_]+)\\s*\\(([\\s\\S]*?)\\)\\s*=>\\s*new\\s+' +
    className + '\\s*\\(', 'g');
  let hit;
  while ((hit = factory.exec(src)) !== null) {
    const parameters = hit[2].split(',').map(raw => raw.trim()).filter(Boolean).map((raw) => {
      const [head, ...rest] = raw.split('=');
      const words = head.trim().split(/\s+/);
      return { name: words[words.length - 1], fallback: rest.length ? rest.join('=').trim() : null };
    });
    const args = callArguments(src, hit.index + hit[0].length - 1, { verbatim: true });
    if (!args) { continue; }
    table[hit[1]] = {
      parameters,
      codeExpression: args[ctorCodeAt],
      statusExpression: args[ctorStatusAt]
    };
  }
  return { table, ctorCodeAt, ctorStatusAt };
}

/** `public const string StaleRevision = "workforce.stale-revision";` → both `Class.Name` and `Name`. */
function constantTable (files) {
  const constants = {};
  for (const file of files) {
    const src = blankComments(fs.readFileSync(file, 'utf8'), { verbatim: true });
    const className = (/(?:class|record)\s+([A-Za-z0-9_]+)/.exec(src) || [])[1];
    const re = /public\s+const\s+string\s+([A-Za-z0-9_]+)\s*=\s*"([^"]*)"\s*;/g;
    let hit;
    while ((hit = re.exec(src)) !== null) {
      constants[hit[1]] = hit[2];
      if (className) { constants[className + '.' + hit[1]] = hit[2]; }
    }
  }
  return constants;
}

/** Every method body in a C# file, keyed by simple name. Expression-bodied members included. */
function methodBodies (source) {
  const src = blankComments(source, { verbatim: true });
  const bodies = {};
  const signature =
    /(?:^|\n)[ \t]*(?:\[[^\]]*\][ \t]*\n?[ \t]*)*(?:public|private|protected|internal)\s+(?:(?:static|async|sealed|override|virtual|new|partial|extern|readonly)\s+)*[A-Za-z0-9_<>,.[\]?\s]+?\s([A-Za-z0-9_]+)\s*\(/g;
  let hit;
  while ((hit = signature.exec(src)) !== null) {
    const name = hit[1];
    if (CSHARP_KEYWORD_CALLS.has(name)) { continue; }
    const open = src.lastIndexOf('(', signature.lastIndex);
    const args = callArguments(src, open, { verbatim: true });
    if (args === null) { continue; }
    let depth = 0;
    let i = open;
    let close = -1;
    while (i < src.length) {
      if (src[i] === '(') { depth++; } else if (src[i] === ')') { depth--; if (depth === 0) { close = i; break; } }
      i++;
    }
    if (close < 0) { continue; }
    let j = close + 1;
    while (j < src.length && /\s/.test(src[j])) { j++; }
    let body = null;
    if (src[j] === '{') {
      const block = blockAt(src, j);
      if (block) { body = block.text; }
    } else if (src[j] === '=' && src[j + 1] === '>') {
      const end = src.indexOf(';', j);
      if (end > 0) { body = src.slice(j + 2, end); }
    }
    if (body === null) { continue; }
    (bodies[name] = bodies[name] || []).push(body);
  }
  return bodies;
}

/**
 * The calls a body makes that could reach one of THIS module's own methods.
 *
 * The qualifier decides, and it is what keeps the walk from wandering: an unqualified call or one on
 * an injected field is the module's own; a call on a type is followed only when that type is declared
 * in the scanned corpus (so `SHA256.Create(…)` is not confused with a controller action named
 * `Create`, which is exactly the false path an unqualified walk produced); a call on a local is the
 * framework's — LINQ, EF, StringBuilder — and is left alone.
 */
function outboundCalls (body, classNames) {
  const names = new Set();
  const re = /(?:([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let hit;
  while ((hit = re.exec(body)) !== null) {
    const receiver = hit[1];
    const name = hit[2];
    if (CSHARP_KEYWORD_CALLS.has(name)) { continue; }
    if (/\bnew\s+$/.test(body.slice(Math.max(0, hit.index - 8), hit.index))) { continue; }
    if (receiver === undefined) { names.add(name); continue; }
    if (receiver === 'this' || receiver.startsWith('_')) { names.add(name); continue; }
    if (/^[A-Z]/.test(receiver) && classNames.has(receiver)) { names.add(name); continue; }
  }
  return [...names];
}

/**
 * The directories a C# file's `using` declarations put in scope, as paths under the checkout.
 *
 * `using WebApi.Services.Growth` -> `Services/Growth`. Deliberately only the MODULE directories
 * (`Services/<X>`, `Helpers/<X>`) and never the flat `Services/` or `Helpers/` roots: those hold
 * sixty files of legacy service whose method names (`Create`, `List`, `Detail`) collide with every
 * controller action in the estate, and following those collisions is what made a first cut of this
 * check attribute every module's refusals to every route — the "reds on everything" failure. A
 * module's own refusals live in its own directory.
 */
function moduleDirectories (apiRepo, source) {
  const found = [];
  const re = /using\s+(WebApi\.(?:Services|Helpers)\.[A-Za-z0-9_.]+)\s*;/g;
  let hit;
  while ((hit = re.exec(source)) !== null) {
    const relative = hit[1].replace(/^WebApi\./, '').replace(/\./g, path.sep);
    const full = path.join(apiRepo, relative);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) { found.push(full); }
  }
  return found;
}

/**
 * Reads an API checkout into `{ routes, refusalsFor }`. Routes come from the attributes alone (cheap,
 * every controller); the reachable refusals of one route are computed on demand, because only the
 * routes a fixture ANCHORS are ever compared and walking all 638 of them would be a minute of work
 * nobody reads.
 */
function deriveBackend (apiRepo) {
  const controllerDir = path.join(apiRepo, 'Controllers');
  if (!fs.existsSync(controllerDir)) {
    throw new Error('no Controllers/ under ' + apiRepo + ' — is that an OkamAPI checkout?');
  }

  const corpus = []
    .concat(csharpFiles(controllerDir, []))
    .concat(csharpFiles(path.join(apiRepo, 'Services'), []))
    .concat(csharpFiles(path.join(apiRepo, 'Helpers'), []))
    .filter(file => !/WebApi\.Tests/.test(file));

  // The typed exception classes: one per module, each fixing status per factory.
  const exceptionFiles = corpus.filter(file => /(ApiException|ProblemException)\.cs$/.test(file));
  const exceptions = {};
  for (const file of exceptionFiles) {
    const className = path.basename(file, '.cs');
    exceptions[className] = exceptionFactories(fs.readFileSync(file, 'utf8'), className);
  }

  const constants = constantTable(corpus);

  const parsed = new Map();
  function parse (file) {
    if (parsed.has(file)) { return parsed.get(file); }
    const source = fs.readFileSync(file, 'utf8');
    const blanked = blankComments(source, { verbatim: true });
    const classes = new Set();
    const classRe = /(?:class|record|struct)\s+([A-Za-z0-9_]+)/g;
    let classHit;
    while ((classHit = classRe.exec(blanked)) !== null) { classes.add(classHit[1]); }
    const record = {
      file,
      source,
      blanked,
      classes,
      // The exception classes themselves are never walked: their factory bodies construct the
      // exception from unbound parameters, which would read as refusals carrying no code.
      bodies: exceptionFiles.includes(file) ? {} : methodBodies(source),
      moduleDirs: moduleDirectories(apiRepo, blanked),
      baseClasses: [...blanked.matchAll(/class\s+[A-Za-z0-9_]+\s*:\s*([A-Za-z0-9_,<>\s.]+)/g)]
        .reduce((all, m) => all.concat(m[1].split(',').map(s => s.trim().split('<')[0])), [])
    };
    parsed.set(file, record);
    return record;
  }

  const declaringFile = new Map();
  for (const file of corpus) {
    const base = path.basename(file, '.cs');
    if (!declaringFile.has(base)) { declaringFile.set(base, file); }
  }

  const unresolved = [];

  function refusalsIn (body) {
    const found = new Set();
    for (const className of Object.keys(exceptions)) {
      const { table, ctorCodeAt, ctorStatusAt } = exceptions[className];

      const viaFactory = new RegExp(className + '\\s*\\.\\s*([A-Za-z0-9_]+)\\s*\\(', 'g');
      let hit;
      while ((hit = viaFactory.exec(body)) !== null) {
        const factory = table[hit[1]];
        if (!factory) { continue; }
        const args = callArguments(body, hit.index + hit[0].length - 1, { verbatim: true }) || [];
        // Bounded: a factory forwarded its own parameter name (`Forbidden(code, …)` called with a
        // variable also spelled `code`) is a fixed point, and an unbounded resolver loops on it.
        const bind = (expression, depth) => {
          if (expression === undefined || depth > 4) { return null; }
          const literal = unquote(expression);
          if (literal !== null) { return literal; }
          if (/^\d+$/.test(expression)) { return expression; }
          if (constants[expression] !== undefined) { return constants[expression]; }
          const at = factory.parameters.findIndex(p => p.name === expression);
          if (at >= 0) {
            if (args[at] !== undefined && args[at] !== expression) { return bind(args[at], depth + 1); }
            if (factory.parameters[at].fallback) { return bind(factory.parameters[at].fallback, depth + 1); }
          }
          return null;
        };
        const status = bind(factory.statusExpression, 0);
        const code = bind(factory.codeExpression, 0);
        if (status === null || code === null) {
          unresolved.push(className + '.' + hit[1] + ' -> status=' + status + ' code=' + code);
          continue;
        }
        found.add(shape(status, code));
      }

      const viaConstructor = new RegExp('new\\s+' + className + '\\s*\\(', 'g');
      while ((hit = viaConstructor.exec(body)) !== null) {
        const args = callArguments(body, hit.index + hit[0].length - 1, { verbatim: true }) || [];
        const codeArg = args[ctorCodeAt];
        const statusArg = args[ctorStatusAt];
        const code = codeArg === undefined
          ? null
          : (unquote(codeArg) !== null ? unquote(codeArg) : (constants[codeArg] !== undefined ? constants[codeArg] : null));
        const status = statusArg !== undefined && /^\d+$/.test(statusArg) ? statusArg : null;
        if (status === null || code === null) {
          unresolved.push('new ' + className + ' -> status=' + status + ' code=' + code);
          continue;
        }
        found.add(shape(status, code));
      }
    }
    return found;
  }

  /**
   * The files one controller's actions can reach: itself, its base-class chain (where the shared
   * `RequireUserId()` / concealment helpers live) and the module directories its `using`s name, one
   * hop onward from those. Bounded by construction — a module cannot silently start contributing
   * another module's refusals.
   */
  function scopeFor (controllerFile) {
    const scope = new Set([controllerFile]);
    const pending = [controllerFile];
    let hops = 0;
    while (pending.length && hops < 2) {
      const frontier = pending.splice(0, pending.length);
      hops += 1;
      for (const file of frontier) {
        const record = parse(file);
        for (const base of record.baseClasses) {
          const declared = declaringFile.get(base);
          if (declared && !scope.has(declared)) { scope.add(declared); pending.push(declared); }
        }
        for (const dir of record.moduleDirs) {
          for (const member of csharpFiles(dir, [])) {
            if (!scope.has(member)) { scope.add(member); pending.push(member); }
          }
        }
      }
    }
    return [...scope];
  }

  function indexOf (scope) {
    const bodies = {};
    const classes = new Set(Object.keys(exceptions));
    for (const file of scope) {
      const record = parse(file);
      for (const name of record.classes) { classes.add(name); }
      for (const name of Object.keys(record.bodies)) {
        (bodies[name] = bodies[name] || []).push(...record.bodies[name]);
      }
    }
    return { bodies, classes };
  }

  const routes = {};
  const controllers = csharpFiles(controllerDir, []).filter(file => !/WebApi\.Tests/.test(file));
  for (const file of controllers) {
    const src = blankComments(fs.readFileSync(file, 'utf8'), { verbatim: true });
    const base = (/\[Route\("([^"]*)"\)\]/.exec(src) || [])[1];
    if (base === undefined) { continue; }
    const actionRe =
      /\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?\]\s*(?:\[[^\]]*\]\s*)*(?:public|internal)\s+[\s\S]*?\s([A-Za-z0-9_]+)\s*\(/g;
    let hit;
    while ((hit = actionRe.exec(src)) !== null) {
      const verb = hit[1].toUpperCase();
      const template = ('/' + base + '/' + (hit[2] || ''))
        .replace(/\/+/g, '/')
        .replace(/\{([A-Za-z0-9_]+)(:[^}]*)?\}/g, '{$1}')
        .replace(/\/$/, '') || '/';
      routes[verb + ' ' + template] = { controller: path.relative(apiRepo, file), file, action: hit[3] };
    }
  }

  const scopes = new Map();
  function refusalsFor (route) {
    const entry = routes[route];
    if (!entry) { return null; }
    if (entry.refusals) { return entry.refusals; }
    if (!scopes.has(entry.file)) { scopes.set(entry.file, indexOf(scopeFor(entry.file))); }
    const { bodies, classes } = scopes.get(entry.file);

    const closure = (body, seen) => {
      const found = refusalsIn(body);
      for (const name of outboundCalls(body, classes)) {
        if (seen.has(name)) { continue; }
        seen.add(name);
        for (const definition of (bodies[name] || [])) {
          for (const refusal of closure(definition, seen)) { found.add(refusal); }
        }
      }
      return found;
    };

    const found = new Set();
    for (const body of (parse(entry.file).bodies[entry.action] || [])) {
      for (const refusal of closure(body, new Set([entry.action]))) { found.add(refusal); }
    }
    entry.refusals = [...found].sort();
    return entry.refusals;
  }

  return {
    repo: apiRepo,
    routes,
    refusalsFor,
    exceptionClasses: Object.keys(exceptions).sort(),
    scanned: { corpus: corpus.length, controllers: controllers.length, routes: Object.keys(routes).length },
    unresolved: () => [...new Set(unresolved)].sort()
  };
}

// ---- the fixture side --------------------------------------------------------------------------

// An annotation OPENS a comment line. Prose that merely names the token mid-sentence is not one —
// this file's own header does that, and a looser match read it as a malformed anchor. A token that
// appears anywhere else is collected as `loose` and reported, so the strictness cannot hide a real
// annotation somebody wrote in the wrong place.
const ANNOTATION = /^[ \t]*\/\/[ \t]*@backend(-preamble|-unmodelled)?\b[ \t]*([^\n]*)/gm;
const ANY_TOKEN = /@backend(?:-preamble|-unmodelled)?\b/g;

/**
 * A refusal primitive is a function whose PARAMETERS name both `status` and `code`. Covers
 * `function growthError (ctx, status, code, message)`, `function problem (res, status, code, …)` and
 * the `problem: (status, code, …) =>` bound onto the module context. Derived rather than listed, so a
 * new helper shaped like a refusal is checked like one.
 */
function refusalPrimitives (src) {
  const primitives = {};
  const declaration = /(?:function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)|([A-Za-z0-9_$]+)\s*:\s*\(([^)]*)\)\s*=>)/g;
  let hit;
  while ((hit = declaration.exec(src)) !== null) {
    const name = hit[1] || hit[3];
    const parameters = (hit[2] !== undefined ? hit[2] : hit[4]).split(',').map(p => p.trim()).filter(Boolean);
    const statusAt = parameters.indexOf('status');
    const codeAt = parameters.indexOf('code');
    if (statusAt < 0 || codeAt < 0) { continue; }
    primitives[name] = { statusAt, codeAt, parameters };
  }
  return primitives;
}

/** Top-level `function NAME (…) { … }` bodies, so a wrapper like `growthNotFound(ctx)` resolves. */
function fixtureFunctions (src) {
  const functions = {};
  const declaration = /function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let hit;
  while ((hit = declaration.exec(src)) !== null) {
    const block = blockAt(src, hit.index + hit[0].length - 1);
    if (block) { functions[hit[1]] = block.text; }
  }
  return functions;
}

function readFixtureFile (file) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = blankComments(raw);
  const primitives = refusalPrimitives(src);
  const functions = fixtureFunctions(src);

  const bypasses = [];

  function refusalsIn (body, seen) {
    const found = new Set();
    for (const name of Object.keys(primitives)) {
      const { statusAt, codeAt } = primitives[name];
      const call = new RegExp('(?:^|[^A-Za-z0-9_$.])' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
      let hit;
      while ((hit = call.exec(body)) !== null) {
        const args = callArguments(body, body.indexOf('(', hit.index + hit[0].length - 1));
        if (!args) { continue; }
        // The primitive is reached either directly (`problem(res, 409, 'x', …)`) or through the module
        // context (`ctx.problem(409, 'x', …)`), whose bound arrow drops the response argument. Both
        // read off the same signature; the offset is whichever alignment yields a literal pair.
        const candidates = [[statusAt, codeAt], [statusAt + 1, codeAt + 1]];
        for (const [s, c] of candidates) {
          const status = args[s];
          const code = unquote(args[c]);
          if (status !== undefined && /^\d{3}$/.test(status) && code !== null) {
            found.add(shape(status, code));
            break;
          }
        }
      }
    }
    for (const name of Object.keys(functions)) {
      if (seen.has(name)) { continue; }
      if (primitives[name]) { continue; }
      const call = new RegExp('(?:^|[^A-Za-z0-9_$.])' + name.replace(/\$/g, '\\$') + '\\s*\\(');
      if (!call.test(body)) { continue; }
      const next = new Set(seen);
      next.add(name);
      for (const refusal of refusalsIn(functions[name], next)) { found.add(refusal); }
    }
    return found;
  }

  // A non-2xx answered WITHOUT going through a primitive carries no code this check can read. It is
  // recorded rather than ignored: a handler that started answering refusals by hand would otherwise
  // shrink what is compared while everything still looked green.
  function bypassesIn (body) {
    const out = [];
    const re = /(?:^|[^A-Za-z0-9_$.])(?:ctx\.)?send(?:Text)?\s*\(/g;
    let hit;
    while ((hit = re.exec(body)) !== null) {
      const args = callArguments(body, body.indexOf('(', hit.index + hit[0].length - 1));
      if (!args) { continue; }
      for (const argument of args.slice(0, 2)) {
        if (/^\d{3}$/.test(argument) && Number(argument) >= 300) { out.push(argument); }
      }
    }
    return out;
  }

  const anchors = [];
  const preambles = [];
  const unmodelled = [];
  const claimed = new Set();
  ANNOTATION.lastIndex = 0;
  let hit;
  while ((hit = ANNOTATION.exec(raw)) !== null) {
    const kind = hit[1] || '';
    const rest = hit[2].trim();
    const at = lineOf(raw, hit.index);
    claimed.add(at);
    if (kind === '-unmodelled') {
      const parsed = /^(\d{3})\s+(\S+)\s*(?:[—-]\s*(.*))?$/.exec(rest);
      if (!parsed) {
        unmodelled.push({ malformed: rest, line: at });
        continue;
      }
      unmodelled.push({ status: parsed[1], code: parsed[2], reason: (parsed[3] || '').trim(), line: at });
      continue;
    }
    const block = blockAt(src, hit.index + hit[0].length);
    if (!block) {
      (kind === '-preamble' ? preambles : anchors).push({ malformed: rest, line: at });
      continue;
    }
    const refusals = [...refusalsIn(block.text, new Set())].sort();
    for (const status of bypassesIn(block.text)) { bypasses.push({ line: at, status }); }
    if (kind === '-preamble') {
      preambles.push({ prefix: rest || null, line: at, refusals, from: hit.index });
    } else {
      const parsed = /^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)$/.exec(rest);
      if (!parsed) {
        anchors.push({ malformed: rest, line: at });
        continue;
      }
      anchors.push({
        route: parsed[1] + ' ' + parsed[2].replace(/\/$/, ''),
        line: at,
        refusals,
        from: hit.index
      });
    }
  }

  const loose = [];
  ANY_TOKEN.lastIndex = 0;
  let token;
  while ((token = ANY_TOKEN.exec(raw)) !== null) {
    const at = lineOf(raw, token.index);
    if (!claimed.has(at)) { loose.push({ line: at, text: raw.split('\n')[at - 1].trim() }); }
  }

  return {
    file,
    primitives: Object.keys(primitives).sort(),
    anchors,
    preambles,
    unmodelled,
    bypasses,
    loose
  };
}

/** Every fixture file, with its anchors resolved into route -> refusal shapes. */
function deriveFixture (fixtureDir) {
  const files = fs.readdirSync(fixtureDir)
    .filter(name => name.endsWith('.js'))
    .map(name => path.join(fixtureDir, name))
    .sort();

  const routes = {};
  const filesRead = [];
  const malformed = [];
  const bypasses = [];
  const loose = [];
  let anchorCount = 0;

  for (const file of files) {
    const read = readFixtureFile(file);
    filesRead.push({
      file: path.basename(file),
      anchors: read.anchors.length,
      primitives: read.primitives,
      unmodelled: read.unmodelled,
      hasRefusalSites: read.primitives.length > 0
    });
    for (const stray of read.loose) {
      loose.push(path.basename(file) + ':' + stray.line + '  ' + stray.text);
    }
    for (const bad of read.anchors.concat(read.preambles).concat(read.unmodelled)) {
      if (bad.malformed !== undefined) {
        malformed.push(path.basename(file) + ':' + bad.line + '  ' + bad.malformed);
      }
    }
    for (const bypass of read.bypasses) {
      bypasses.push(path.basename(file) + ':' + bypass.line + '  status ' + bypass.status);
    }
    for (const anchor of read.anchors) {
      if (anchor.malformed !== undefined) { continue; }
      anchorCount += 1;
      const inherited = read.preambles
        .filter(p => p.malformed === undefined)
        .filter(p => p.from < anchor.from)
        .filter(p => p.prefix === null || anchor.route.split(' ')[1].startsWith(p.prefix))
        .reduce((all, p) => all.concat(p.refusals), []);
      const existing = routes[anchor.route];
      const refusals = new Set((existing ? existing.refusals : []).concat(anchor.refusals, inherited));
      routes[anchor.route] = {
        file: path.basename(file),
        line: anchor.line,
        refusals: [...refusals].sort(),
        unmodelled: (existing ? existing.unmodelled : []).concat(
          read.unmodelled.filter(u => u.malformed === undefined))
      };
    }
  }

  return { dir: fixtureDir, routes, files: filesRead, anchorCount, malformed, bypasses, loose };
}

// ---- the comparison ----------------------------------------------------------------------------

/**
 * MISMATCH is the loud class and admits no exemption: the same code answered at a different status is
 * unambiguously one of the two sides being a release old. It is the shape the flag was raised for.
 *
 * MISSING and EXTRA are per-route set differences. MISSING may be declared away at the file with a
 * reason; EXTRA may not — a fixture that refuses something the backend cannot refuse is a journey
 * asserting against a world that does not exist, which is the same lie in the other direction.
 */
function compare (fixture, backend) {
  const findings = [];
  const compared = [];

  for (const route of Object.keys(fixture.routes).sort()) {
    const claim = fixture.routes[route];
    const truth = backend.routes[route];
    if (!truth) {
      findings.push({
        kind: 'unknown-route',
        route,
        where: claim.file + ':' + claim.line,
        detail: 'no controller in ' + path.basename(backend.repo) + ' declares this route'
      });
      continue;
    }

    const exempt = new Set(claim.unmodelled.map(u => shape(u.status, u.code)));
    const fixtureShapes = new Set(claim.refusals);
    const backendShapes = new Set(truth.refusals);
    const codeOf = s => s.slice(s.indexOf(' ') + 1);
    const statusOf = s => s.slice(0, s.indexOf(' '));

    const mismatched = new Set();
    for (const mine of fixtureShapes) {
      for (const theirs of backendShapes) {
        if (codeOf(mine) === codeOf(theirs) && statusOf(mine) !== statusOf(theirs)) {
          findings.push({
            kind: 'status-mismatch',
            route,
            where: claim.file + ':' + claim.line,
            detail: 'code ' + codeOf(mine) + ' — fixture answers ' + statusOf(mine) +
              ', ' + truth.controller + ' answers ' + statusOf(theirs)
          });
          mismatched.add(mine);
          mismatched.add(theirs);
        }
      }
    }

    for (const theirs of [...backendShapes].sort()) {
      if (fixtureShapes.has(theirs) || mismatched.has(theirs) || exempt.has(theirs)) { continue; }
      findings.push({
        kind: 'fixture-behind',
        route,
        where: claim.file + ':' + claim.line,
        detail: truth.controller + ' can answer ' + theirs + ' and the fixture never does'
      });
    }

    for (const mine of [...fixtureShapes].sort()) {
      if (backendShapes.has(mine) || mismatched.has(mine)) { continue; }
      findings.push({
        kind: 'fixture-ahead',
        route,
        where: claim.file + ':' + claim.line,
        detail: 'the fixture answers ' + mine + ' and ' + truth.controller + ' never does'
      });
    }

    compared.push({
      route,
      fixture: [...fixtureShapes].sort(),
      backend: [...backendShapes].sort()
    });
  }

  // An exemption that names a refusal the backend no longer has anywhere on that file's routes has
  // outlived its reason and is reported, so the declared holes cannot rot into a second stale list.
  const byFile = {};
  for (const route of Object.keys(fixture.routes)) {
    const claim = fixture.routes[route];
    const truth = backend.routes[route];
    const bucket = byFile[claim.file] = byFile[claim.file] || { declared: [], available: new Set() };
    for (const u of claim.unmodelled) {
      if (!bucket.declared.some(d => d.status === u.status && d.code === u.code)) { bucket.declared.push(u); }
    }
    for (const refusal of (truth ? truth.refusals : [])) { bucket.available.add(refusal); }
  }
  for (const file of Object.keys(byFile).sort()) {
    for (const declared of byFile[file].declared) {
      if (byFile[file].available.has(shape(declared.status, declared.code))) { continue; }
      findings.push({
        kind: 'stale-exemption',
        route: '(file)',
        where: file + ':' + declared.line,
        detail: 'declares ' + shape(declared.status, declared.code) +
          ' unmodelled, but no anchored route in this file can answer it'
      });
    }
  }

  return { findings, compared };
}

module.exports = {
  blankComments,
  callArguments,
  blockAt,
  exceptionFactories,
  methodBodies,
  refusalPrimitives,
  deriveBackend,
  deriveFixture,
  readFixtureFile,
  compare
};
