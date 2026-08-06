using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;
using static WebApi.Tests.Modules.ActorStampSource;

namespace WebApi.Tests.Modules;

/// <summary>
/// One estate-wide rule, in place of the per-module copies of it: <b>an actor stamped into a module's audit
/// evidence must be traceable, at its own site, to something that cannot be blank for a reason other than a
/// caller's good behaviour.</b>
///
/// <para><b>The defect this exists to catch.</b> An empty string was written into
/// <c>MealsAuditEvent.ActorReference</c> — a row a reader testing <c>!= null</c> counts as attributed while
/// it names nobody, in a ledger made immutable by an AFTER trigger. A missing actor guard is an ABSENT line,
/// so no reviewer sees it and no runtime probe exists for a stamp nobody considered; the population was
/// therefore verified BY HAND, and a census verified by hand protects only the day it was taken. So the rule
/// is mechanical and fails CLOSED: an unrecognised provenance is a failure rather than a pass, and a new site
/// is red until its author states how its value is guarded.</para>
///
/// <para><b>Why one mechanism and not five files.</b> This began as <c>MealsAuditActorCallSiteTests</c>,
/// ~780 lines of which ~500 were source geometry — a code mask, a brace scanner, a binding chaser. Copying
/// that per module would have been five copies of the analysis and five places for it to drift, against an
/// estate standard that treats duplication as merge-blocking; and the sibling modules turned out NOT to be
/// near-identical, so a copy would have had to be edited into a different rule each time anyway. The split
/// follows <see cref="ModuleGateOrderingTests"/>, the estate's other derived-scope pin: the analysis is
/// shared (<see cref="ActorStampSource"/>, <see cref="ActorStampRule"/>), what each module CLAIMS is
/// declared as data (<see cref="ModuleActorStamps"/>), and the census assertions below are what keep those
/// claims honest. Each module is its own test case, so a failure names the module and the file.</para>
///
/// <para><b>Scope is derived, not listed.</b> A file is in scope for a module because it mentions the stamped
/// TYPE, which no site can avoid. A hand-maintained list of service paths is the same class of bug this test
/// exists to catch — it silently stops covering code somebody put somewhere else.</para>
///
/// <para><b>Why a writer-level check is not the gate.</b> The Meals and Training writers do refuse a blank
/// actor, but only as a net: by then the domain work is staged, so they can answer nothing better than a 500
/// where the caller owed a refusal before any write — and a caller-side tag
/// (<c>"concierge:" + resolve(user)</c>) is never blank at the writer even when the resolver named nobody.
/// The per-site guard is the enforcement point; this is what keeps it universal.</para>
///
/// <para>The test project is deliberately out of scope: its probes construct entries with blank actors on
/// purpose, to drive those nets.</para>
/// </summary>
public sealed class ModuleAuditActorCallSiteTests
{
    /// <summary>
    /// The module NAMES rather than the declarations themselves: xUnit can serialize a string, so each case
    /// is named after its module in the runner output and a failure says which module is red.
    /// </summary>
    public static TheoryData<string> Modules()
    {
        var data = new TheoryData<string>();
        foreach (var module in ModuleActorStamps.All)
        {
            data.Add(module.Module);
        }

        return data;
    }

    // ---- 1. the rule ---------------------------------------------------------------------------------

    /// <summary>
    /// Every actor stamped into a module's evidence must be traceable, at its own site, to something that
    /// cannot hand over a blank — a resolver that refuses, a value blank-proof by type, or a refusal that
    /// runs ahead of the stamp.
    /// </summary>
    [Theory]
    [MemberData(nameof(Modules))]
    public void Every_module_audit_site_stamps_an_actor_that_cannot_be_blank(string moduleName)
    {
        var module = ModuleActorStamps.ByName(moduleName);
        var repoRoot = TestRepoRoot.Resolve();
        var offenders = new List<string>();

        foreach (var (stamp, file, source, code, blocks, site) in SitesOf(repoRoot, module))
        {
            var where = Relative(repoRoot, file) + ":" + LineOf(source, site.Index);

            if (site.Initializer == null)
            {
                offenders.Add(where + ": the " + stamp.TypeName + " is built without an object initializer, "
                                    + "so no reader (and no test) can see which actor it carries. Construct "
                                    + "it inline.");
                continue;
            }

            var actor = ActorExpression(source, code, site, stamp.ActorProperty);

            if (module.Coherence != null)
            {
                var verdict = JudgeUnderDiscriminator(
                    module, stamp, source, code, blocks, site, actor, where, offenders);
                if (verdict != DiscriminatorVerdict.ApplyBlankRule)
                {
                    continue; // rejected, or fully settled by the coherence contract
                }
            }

            if (actor == null)
            {
                offenders.Add(where + ": the " + stamp.TypeName + " names no " + stamp.ActorProperty
                                    + " at all, so the row would be written unattributed.");
                continue;
            }

            if (!ActorStampRule.IsAttributable(
                    actor, source, code, blocks, site, module.Provenances, module.Guards, out var reason))
            {
                offenders.Add(where + ": " + stamp.ActorProperty + " = " + Condense(actor) + " — " + reason);
            }
        }

        // The module's OWN accepted provenances, so the message tells this author what this module permits
        // rather than describing the estate in general.
        var remedies = module.Provenances.Select(p => p.Advice)
            .Concat(module.Guards.Select(g => "hand the actor to " + g + "(...) ahead of the stamp"))
            .Append("refuse the caller ahead of the stamp with `if (string.IsNullOrWhiteSpace(x)) throw`")
            .ToList();

        Assert.True(offenders.Count == 0,
            "A " + module.Module + " audit row would be stamped with an actor whose value is not provably "
            + "non-blank. An unattributable row is worse than a refused request: it is immutable, and a "
            + "reader testing the actor column for null counts it as attributed. In " + module.Module
            + " you may:\n    - " + string.Join("\n    - ", remedies)
            + "\nIf the site genuinely has no human actor, declare that in ModuleActorStamps with the reason "
            + "— do not widen the rule to make the site pass:\n  " + string.Join("\n  ", offenders));
    }

    // ---- 2. the proofs behind each accepted provenance -----------------------------------------------

    /// <summary>
    /// The proof behind the resolver convention. <c>?? string.Empty</c> in one of these is the exact defect
    /// that shipped, and it leaves no trace at the call site — so the resolver is pinned where it lives,
    /// because a defaulting resolver makes every site that trusts it wrong at once.
    /// </summary>
    [Theory]
    [MemberData(nameof(Modules))]
    public void Every_declared_actor_resolver_refuses_a_caller_it_cannot_name(string moduleName)
    {
        var module = ModuleActorStamps.ByName(moduleName);
        var repoRoot = TestRepoRoot.Resolve();
        var offenders = new List<string>();

        foreach (var (file, source) in FilesInScope(repoRoot, module))
        {
            foreach (var resolver in module.Resolvers)
            {
                foreach (var declaration in ResolverDeclarations(source, resolver))
                {
                    if (!declaration.Contains("throw", StringComparison.Ordinal))
                    {
                        offenders.Add(Relative(repoRoot, file) + ": " + resolver + " returns instead of "
                                      + "refusing when the caller cannot be resolved.");
                    }

                    if (Regex.IsMatch(declaration, @"\?\?\s*(?:string\.Empty|"""")"))
                    {
                        offenders.Add(Relative(repoRoot, file) + ": " + resolver
                                      + " falls back to an empty actor.");
                    }
                }
            }
        }

        Assert.True(offenders.Count == 0,
            "The call-site convention accepts a file-local resolver as an actor provenance precisely because "
            + "it refuses rather than defaulting:\n  " + string.Join("\n  ", offenders));
    }

    /// <summary>
    /// The proof behind a declared guard. A guard method is what lets a service refuse an actor that arrived
    /// already-resolved from a controller without repeating the <c>if</c> at every stamp — so if it stops
    /// refusing, every site that delegates to it silently stops being guarded.
    /// </summary>
    [Theory]
    [MemberData(nameof(Modules))]
    public void Every_declared_actor_guard_refuses_a_blank_it_is_handed(string moduleName)
    {
        var module = ModuleActorStamps.ByName(moduleName);
        var repoRoot = TestRepoRoot.Resolve();
        var offenders = new List<string>();

        foreach (var (file, source) in FilesInScope(repoRoot, module))
        {
            foreach (var guard in module.Guards)
            {
                foreach (var declaration in GuardDeclarations(source, guard))
                {
                    if (!Regex.IsMatch(declaration, @"string\.IsNullOrWhiteSpace\s*\(")
                        || !declaration.Contains("throw", StringComparison.Ordinal))
                    {
                        offenders.Add(Relative(repoRoot, file) + ": " + guard + " does not refuse a blank "
                                      + "actor with `string.IsNullOrWhiteSpace(...)` and a throw. "
                                      + "IsNullOrEmpty does not count: it admits \"   \", which reads as "
                                      + "attributed and names nobody.");
                    }
                }
            }
        }

        Assert.True(offenders.Count == 0,
            "A declared actor guard no longer refuses, which un-guards every site that delegates to it:\n  "
            + string.Join("\n  ", offenders));
    }

    /// <summary>
    /// The proof behind a typed provenance, and the reason it is accepted without inspecting any caller: a
    /// <see cref="Guid"/>'s <c>ToString()</c> is never blank. Were the id ever widened to a string, the sites
    /// that stamp it would silently start depending on whatever wrote it.
    /// </summary>
    /// <remarks>
    /// A <see cref="Fact"/> over every module rather than a per-module theory: only Meals declares a typed
    /// provenance today, so four of five cases would have been green while asserting nothing — the vacuous
    /// pass a census floor exists to prevent. The floor here is that the estate still has one at all.
    /// </remarks>
    [Fact]
    public void Every_typed_actor_provenance_is_blank_proof_by_type()
    {
        var typed = ModuleActorStamps.All
            .SelectMany(m => m.Provenances.OfType<TypedIdProvenance>())
            .ToList();

        Assert.NotEmpty(typed);

        foreach (var provenance in typed)
        {
            var property = provenance.DeclaringType.GetProperty(provenance.PropertyName);

            Assert.NotNull(property);
            Assert.Equal(provenance.ExpectedType, property!.PropertyType);
        }
    }

    // ---- 3. what the site rule cannot reach ----------------------------------------------------------

    /// <summary>
    /// The choke point has to be the only door. A row materialized outside its writer would carry whatever
    /// actor the author remembered and bypass both the per-site convention and the writer's net.
    /// </summary>
    [Theory]
    [MemberData(nameof(Modules))]
    public void Nothing_but_the_declared_writer_materializes_a_module_audit_row(string moduleName)
    {
        var module = ModuleActorStamps.ByName(moduleName);
        if (module.Writer == null)
        {
            return; // declared as having no writer choke point; the site rule is the whole enforcement
        }

        var repoRoot = TestRepoRoot.Resolve();
        var writer = module.Writer;
        var pattern = writer.AlsoForbidSetAdd
            ? @"new\s+" + Regex.Escape(writer.MaterializedType) + @"\b|"
              + Regex.Escape(writer.MaterializedType) + @"s\s*\.\s*Add"
            : @"new\s+" + Regex.Escape(writer.MaterializedType) + @"\b";

        var offenders = ProductionSources(repoRoot)
            .Select(f => (File: Relative(repoRoot, f), Text: File.ReadAllText(f)))
            .Where(f => !f.File.EndsWith(writer.OnlyFile, StringComparison.Ordinal))
            .Where(f => Regex.IsMatch(f.Text, pattern))
            .Select(f => f.File)
            .ToList();

        Assert.True(offenders.Count == 0,
            "Only " + writer.OnlyFile + " may materialize a " + writer.MaterializedType
            + " — it is what makes the actor rule enforceable in one place:\n  "
            + string.Join("\n  ", offenders));
    }

    /// <summary>
    /// Closes the post-construction route around the initializer: <c>row.ActorReference = x;</c> on an
    /// already-built row would put the actor out of the site's sight, where the convention above cannot read
    /// it.
    ///
    /// <para><b>Why it tests for a RECEIVER rather than for "outside an initializer".</b> The Meals ancestor
    /// flagged any <c>ActorReference =</c> that sat outside an audit initializer, which was safe only because
    /// <c>ActorReference</c> is a distinctive name. It does not generalise: <c>CreatedByUserId</c> is the
    /// property name on <c>GrowthNewsletter</c> AND on the response models the read path maps it into, so the
    /// blanket rule flagged two honest projections (<c>GrowthNewsletterService</c> building a list item and a
    /// detail). A mapping into another type's initializer writes no ledger row. What is dangerous — and what
    /// no initializer can express — is a member assignment on an existing instance, so that is what is
    /// forbidden.</para>
    /// </summary>
    [Theory]
    [MemberData(nameof(Modules))]
    public void No_actor_is_assigned_onto_an_already_constructed_row(string moduleName)
    {
        var module = ModuleActorStamps.ByName(moduleName);
        var repoRoot = TestRepoRoot.Resolve();
        var offenders = new List<string>();

        foreach (var stamp in module.Stamps)
        {
            var mutation = new Regex(
                @"(?<receiver>[A-Za-z_]\w*)\s*\.\s*" + Regex.Escape(stamp.ActorProperty) + @"\s*=\s*(?!=)");

            foreach (var (file, source) in FilesMentioningStamp(repoRoot, stamp))
            {
                var code = CodeMask(source);

                foreach (Match assignment in mutation.Matches(source))
                {
                    if (!code[assignment.Index])
                    {
                        continue;
                    }

                    offenders.Add(Relative(repoRoot, file) + ":" + LineOf(source, assignment.Index) + " ("
                                  + assignment.Groups["receiver"].Value + "." + stamp.ActorProperty + ")");
                }
            }
        }

        Assert.True(offenders.Count == 0,
            "An actor assigned onto an already-constructed row is invisible to the call-site convention. Set "
            + "it in the initializer where the row is built:\n  " + string.Join("\n  ", offenders));
    }

    // ---- 4. the anti-rot guards ----------------------------------------------------------------------

    /// <summary>
    /// The derived scope has to keep reaching the population. If the extraction silently stops matching — a
    /// reformat, a renamed type, a service moved elsewhere — every assertion above passes vacuously, which is
    /// the failure mode a census pin exists to avoid.
    /// </summary>
    [Theory]
    [MemberData(nameof(Modules))]
    public void The_derived_scope_still_sees_the_whole_population(string moduleName)
    {
        var module = ModuleActorStamps.ByName(moduleName);
        var repoRoot = TestRepoRoot.Resolve();
        var sites = SitesOf(repoRoot, module).Count();
        var files = FilesInScope(repoRoot, module).Select(f => Relative(repoRoot, f.File)).ToList();

        var resolvers = 0;
        var guards = 0;
        foreach (var (_, source) in FilesInScope(repoRoot, module))
        {
            resolvers += module.Resolvers.Sum(r => ResolverDeclarations(source, r).Count);
            guards += module.Guards.Sum(g => GuardDeclarations(source, g).Count);
        }

        foreach (var expected in module.KnownFiles)
        {
            Assert.Contains(files, f => f.EndsWith(expected, StringComparison.Ordinal));
        }

        Assert.True(sites >= module.KnownSiteFloor,
            $"Only {sites} {module.Module} audit sites resolved, against {module.KnownSiteFloor} known. "
            + "Either sites were deliberately removed (lower the floor in the same commit) or the extraction "
            + "has stopped seeing them and every assertion here is now vacuous.");

        Assert.True(resolvers >= module.KnownResolverFloor,
            $"Only {resolvers} {module.Module} actor resolvers resolved, against "
            + $"{module.KnownResolverFloor} known. The declaration extraction has stopped matching, so the "
            + "resolvers are no longer pinned.");

        Assert.True(guards >= module.KnownGuardFloor,
            $"Only {guards} {module.Module} actor guards resolved, against {module.KnownGuardFloor} known. "
            + "The declaration extraction has stopped matching, so the guards are no longer pinned.");
    }

    /// <summary>
    /// The declaration list is the only hand-maintained part of the convention, so it is the part that rots.
    /// A module family that owns an actor-stamped ledger and appears in no declaration would silently fall
    /// out of scope entirely — which is how Meals came to be pinned while five siblings were not.
    ///
    /// <para>Workforce is absent on purpose and is asserted absent, not forgotten: its
    /// <c>WorkforceAuditEntry</c> population is owned by a separate lane, and a declaration added here in
    /// parallel would collide with it. When that lane lands, Workforce joins this list.</para>
    /// </summary>
    [Fact]
    public void Every_module_that_stamps_an_actor_into_an_audit_entry_is_declared()
    {
        var repoRoot = TestRepoRoot.Resolve();
        var declared = ModuleActorStamps.All
            .SelectMany(m => m.Stamps.Select(s => s.TypeName))
            .ToHashSet(StringComparer.Ordinal);

        // Derived, not listed: any `*AuditEntry` type the estate defines is a module audit stamp by
        // construction, because that is the input shape every module's audit writer takes.
        var entryTypes = ProductionSources(repoRoot)
            .SelectMany(f => Regex.Matches(File.ReadAllText(f), @"class\s+(?<name>\w+AuditEntry)\b")
                .Select(m => m.Groups["name"].Value))
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains("MealsAuditEntry", entryTypes);
        Assert.Contains("WorkforceAuditEntry", entryTypes);

        var undeclared = entryTypes
            .Where(t => !declared.Contains(t))
            .Where(t => t != "WorkforceAuditEntry")
            .ToList();

        Assert.True(undeclared.Count == 0,
            "These audit-entry types are stamped with an actor but appear in no ModuleActorStamps "
            + "declaration, so the convention silently does not cover them: " + string.Join(", ", undeclared));
    }

    // ---- the coherence rule --------------------------------------------------------------------------

    private enum DiscriminatorVerdict
    {
        /// <summary>Reported as an offender; stop judging this site.</summary>
        Rejected,

        /// <summary>The coherence contract has judged the site completely; the blank rule adds nothing.</summary>
        Settled,

        /// <summary>A human actor IS expected here, so the ordinary blank rule applies as written.</summary>
        ApplyBlankRule,
    }

    /// <summary>
    /// For a module declaring an <see cref="ActorCoherence"/>: the discriminator and the actor must agree.
    /// </summary>
    private static DiscriminatorVerdict JudgeUnderDiscriminator(
        ModuleActorStampPin module,
        ActorStamp stamp,
        string source,
        bool[] code,
        IReadOnlyList<Span> blocks,
        Site site,
        string? actor,
        string where,
        List<string> offenders)
    {
        var coherence = module.Coherence!;
        var kind = ActorExpression(source, code, site, coherence.DiscriminatorProperty);

        if (kind == null)
        {
            offenders.Add(where + ": the row names no " + coherence.DiscriminatorProperty + ", which is what "
                                + "records whether a human actor is expected at all.");
            return DiscriminatorVerdict.Rejected;
        }

        if (IsNonHumanKind(module, kind))
        {
            // Exactly null, not merely blank: an empty string here is the worst reading of all — the kind
            // says no human acted while a reader testing the column for null counts it as naming one.
            if (actor != null && actor.Trim() != "null")
            {
                offenders.Add(where + ": " + coherence.DiscriminatorProperty + " = " + Condense(kind)
                                    + " records that no store user acted, but " + stamp.ActorProperty + " = "
                                    + Condense(actor) + ". Pass exactly null. " + coherence.Why);
                return DiscriminatorVerdict.Rejected;
            }

            return DiscriminatorVerdict.Settled;
        }

        var trimmedKind = kind.Trim();
        if (trimmedKind == coherence.HumanKind
            || trimmedKind.EndsWith("." + coherence.HumanKind, StringComparison.Ordinal))
        {
            return DiscriminatorVerdict.ApplyBlankRule;
        }

        // The discriminator is a variable, so which case this row is cannot be read from the initializer.
        // Fail closed: the stamping member must then enforce the whole contract itself, in BOTH directions,
        // ahead of the row — which is exactly what makes a blank-actor Admin row and a user-carrying
        // Guest/System row unreachable whatever any of the twenty-two callers passes.
        var enclosing = EnclosingMember(source, blocks, site.Index);
        var body = enclosing == null
            ? string.Empty
            : source.Substring(enclosing.Value.Open, site.Index - enclosing.Value.Open);

        var kindRoot = Regex.Match(trimmedKind, @"^[A-Za-z_]\w*").Value;
        var actorRoot = actor == null ? string.Empty : Regex.Match(actor.Trim(), @"^[A-Za-z_]\w*").Value;

        if (actorRoot.Length > 0 && kindRoot.Length > 0
            && RefusesBlankWhenHuman(body, kindRoot, actorRoot, coherence)
            && RefusesNamedWhenNotHuman(body, kindRoot, actorRoot, coherence))
        {
            return DiscriminatorVerdict.Settled;
        }

        offenders.Add(where + ": " + coherence.DiscriminatorProperty + " = " + Condense(kind)
                            + " is not a literal kind, so this site cannot be judged from the initializer. "
                            + "The stamping member must enforce the contract in BOTH directions ahead of the "
                            + "row: refuse a blank " + stamp.ActorProperty + " when the kind is "
                            + coherence.HumanKind + ", and refuse a non-null one when it is not.");
        return DiscriminatorVerdict.Rejected;
    }

    /// <summary>
    /// <c>if (kind == Human &amp;&amp; string.IsNullOrWhiteSpace(actor)) throw</c>, in either operand order.
    /// <c>IsNullOrWhiteSpace</c> only: <c>IsNullOrEmpty</c> admits <c>"   "</c>.
    /// </summary>
    private static bool RefusesBlankWhenHuman(
        string body, string kindRoot, string actorRoot, ActorCoherence coherence) =>
        Regex.IsMatch(
            body,
            @"if\s*\([^)]*\b" + Regex.Escape(kindRoot) + @"\s*==\s*[\w.]*\b"
            + Regex.Escape(coherence.HumanKind) + @"\b[\s\S]{0,80}?string\.IsNullOrWhiteSpace\(\s*"
            + Regex.Escape(actorRoot) + @"\s*\)[\s\S]{0,240}?throw\b");

    /// <summary>
    /// <c>if (kind != Human &amp;&amp; actor != null) throw</c> — the other direction, which forbids naming a
    /// user on a row whose kind says no user acted.
    /// </summary>
    private static bool RefusesNamedWhenNotHuman(
        string body, string kindRoot, string actorRoot, ActorCoherence coherence) =>
        Regex.IsMatch(
            body,
            @"if\s*\([^)]*\b" + Regex.Escape(kindRoot) + @"\s*!=\s*[\w.]*\b"
            + Regex.Escape(coherence.HumanKind) + @"\b[\s\S]{0,80}?\b" + Regex.Escape(actorRoot)
            + @"\s*!=\s*null[\s\S]{0,320}?throw\b");

    private static bool IsNonHumanKind(ModuleActorStampPin module, string? kind)
    {
        if (module.Coherence == null || kind == null)
        {
            return false;
        }

        var trimmed = kind.Trim();
        return module.Coherence.NonHumanKinds.Any(
            k => trimmed == k || trimmed.EndsWith("." + k, StringComparison.Ordinal));
    }

    // ---- scope plumbing ------------------------------------------------------------------------------

    private static Regex NewOf(string typeName) =>
        new(@"new\s+" + Regex.Escape(typeName) + @"\b", RegexOptions.Compiled);

    /// <summary>Every file in scope for ANY of the module's stamps, each read once.</summary>
    private static IEnumerable<(string File, string Source)> FilesInScope(string repoRoot, ModuleActorStampPin module)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var stamp in module.Stamps)
        {
            foreach (var found in FilesMentioningStamp(repoRoot, stamp))
            {
                if (seen.Add(found.File))
                {
                    yield return found;
                }
            }
        }
    }

    private static IEnumerable<(string File, string Source)> FilesMentioningStamp(string repoRoot, ActorStamp stamp) =>
        FilesMentioning(repoRoot, stamp.TypeName).Select(f => (f, File.ReadAllText(f)));

    private static IEnumerable<(ActorStamp Stamp, string File, string Source, bool[] Code, List<Span> Blocks, Site Site)>
        SitesOf(string repoRoot, ModuleActorStampPin module)
    {
        foreach (var stamp in module.Stamps)
        {
            foreach (var (file, source) in FilesMentioningStamp(repoRoot, stamp))
            {
                var code = CodeMask(source);
                var blocks = Blocks(source, code);
                foreach (var site in Sites(source, code, blocks, NewOf(stamp.TypeName)))
                {
                    yield return (stamp, file, source, code, blocks, site);
                }
            }
        }
    }

    /// <summary>
    /// Declaration bodies of a <c>void</c> guard method — the shape <c>RequireAttributed(string actor)</c>
    /// takes, which <see cref="ResolverDeclarations"/> (which matches <c>string</c> returns) cannot see.
    /// </summary>
    private static List<string> GuardDeclarations(string source, string guardName)
    {
        var declarations = new List<string>();
        foreach (Match match in Regex.Matches(source, @"\bvoid\s+" + Regex.Escape(guardName) + @"\s*\([^)]*\)"))
        {
            var open = source.IndexOf('{', match.Index + match.Length);
            if (open < 0)
            {
                continue;
            }

            var code = CodeMask(source);
            var block = Blocks(source, code).FirstOrDefault(b => b.Open == open);
            if (block.Close > 0)
            {
                declarations.Add(source.Substring(block.Open, block.Close - block.Open + 1));
            }
        }

        return declarations;
    }
}
