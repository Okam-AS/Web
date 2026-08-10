using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using static WebApi.Tests.Modules.ActorStampSource;

namespace WebApi.Tests.Modules;

/// <summary>
/// What a module accepts as proof that the actor at a stamp site cannot be blank. A provenance is a claim
/// about a KIND of expression plus the reason that kind cannot yield a blank; each one carries its own
/// separate proof obligation, asserted by <c>ModuleAuditActorCallSiteTests</c>, so no provenance is merely
/// asserted here.
/// </summary>
internal abstract class ActorProvenance
{
    /// <summary>What to tell an author whose site was refused.</summary>
    public abstract string Advice { get; }

    /// <summary>
    /// True when <paramref name="expression"/> is this provenance. <paramref name="source"/> is the whole
    /// file, because some provenances are only valid given what else the file says (where a receiver was
    /// bound, for instance).
    /// </summary>
    public abstract bool Accepts(string expression, string source, out string? reason);
}

/// <summary>
/// A file-local resolver that REFUSES a caller it cannot name rather than defaulting — the convention every
/// module surface follows (<c>ActorClaims.TryResolveUserId(...) ? actor : throw</c>). Accepted at a site
/// because of what the declaration does, which is why
/// <c>ModuleAuditActorCallSiteTests.Every_declared_actor_resolver_refuses_a_caller_it_cannot_name</c> pins
/// the declaration itself: <c>?? string.Empty</c> in one of these leaves no trace at the call site and would
/// make every site that trusts it wrong at once. That is the exact defect that shipped.
/// </summary>
internal sealed class RefusingResolverProvenance : ActorProvenance
{
    private readonly Regex _call;

    public RefusingResolverProvenance(string resolverName)
    {
        ResolverName = resolverName;
        _call = new Regex(@"\b" + Regex.Escape(resolverName) + @"\s*\(", RegexOptions.Compiled);
    }

    public string ResolverName { get; }

    public override string Advice =>
        "resolve the actor through the refusing " + ResolverName + "(...) convention";

    public override bool Accepts(string expression, string source, out string? reason)
    {
        if (_call.IsMatch(expression))
        {
            reason = null;
            return true;
        }

        reason = "no recognised provenance.";
        return false;
    }
}

/// <summary>
/// A value whose TYPE cannot be blank — a <see cref="Guid"/>'s <c>ToString()</c>, say — read off a receiver
/// this file bound from a named authorization call. Accepted without inspecting any caller, which is the
/// whole point: no caller can make a Guid empty. Both halves matter, and
/// <c>ModuleAuditActorCallSiteTests.Every_typed_actor_provenance_is_blank_proof_by_type</c> pins the type
/// half by reflection — were the id ever widened to a string, every site stamping it would silently start
/// depending on whatever wrote it.
/// </summary>
internal sealed class TypedIdProvenance : ActorProvenance
{
    private readonly Regex _expression;

    // Held as a pattern rather than a Regex: {receiver} is substituted per match, and a compiled Regex
    // round-tripped through ToString() to do that substitution is a trap waiting for a quantifier.
    private readonly string _originPattern;

    /// <param name="expressionPattern">
    /// Must capture the receiver as <c>receiver</c> and match the WHOLE trimmed actor expression, so a
    /// wider expression that merely contains a blank-proof term is not accepted on its strength.
    /// </param>
    /// <param name="originPattern">
    /// How this file must have bound that receiver — <c>{receiver}</c> is substituted with the escaped
    /// captured name. Without it the stamp would be some entity's id rather than the CALLER's.
    /// </param>
    public TypedIdProvenance(
        string expressionPattern, string originPattern, Type declaringType, string propertyName, Type expectedType, string originAdvice)
    {
        _expression = new Regex(expressionPattern, RegexOptions.Compiled);
        _originPattern = originPattern;
        DeclaringType = declaringType;
        PropertyName = propertyName;
        ExpectedType = expectedType;
        Advice = originAdvice;
    }

    public Type DeclaringType { get; }
    public string PropertyName { get; }
    public Type ExpectedType { get; }

    public override string Advice { get; }

    public override bool Accepts(string expression, string source, out string? reason)
    {
        var match = _expression.Match(expression);
        if (!match.Success)
        {
            reason = "no recognised provenance.";
            return false;
        }

        var receiver = Regex.Escape(match.Groups["receiver"].Value);
        if (Regex.IsMatch(source, _originPattern.Replace("{receiver}", receiver, StringComparison.Ordinal)))
        {
            reason = null;
            return true;
        }

        reason = "the " + DeclaringType.Name + " it reads is not bound from the authorization call that "
                 + "returns the CALLER's, so the stamp would be some other row's id.";
        return false;
    }
}

/// <summary>
/// The fail-closed judgement. Everything unrecognised is a refusal, which is the only way a rule protects
/// sites nobody has written yet: a missing actor guard is an ABSENT line, so no reviewer sees it and no
/// runtime probe exists for a stamp nobody considered.
/// </summary>
internal static class ActorStampRule
{
    // A caller-side label, not a resolution: `"concierge:" + resolve(user)` reads as non-blank even when
    // resolve() named nobody, so the tag is stripped before the term behind it is judged.
    private static readonly Regex LiteralTagPrefix =
        new(@"^\s*[@$]*""(?:[^""\\]|\\.)*""\s*\+\s*", RegexOptions.Compiled);

    // A defaulted, hard-coded or literally-absent actor. `??` is checked first and everywhere, including
    // inside an otherwise-recognised provenance, because it is the defect that shipped.
    private static readonly Regex Defaulted =
        new(@"\?\?|^""|^\$""|^@""|^string\.Empty$|^null$", RegexOptions.Compiled);

    /// <summary>
    /// Whether the actor stamped at <paramref name="site"/> is provably non-blank: a declared provenance, a
    /// refusal that runs ahead of the stamp, or a local bound only from declared provenances.
    /// </summary>
    public static bool IsAttributable(
        string actor,
        string source,
        bool[] code,
        IReadOnlyList<Span> blocks,
        Site site,
        IReadOnlyList<ActorProvenance> provenances,
        IReadOnlyList<string> guards,
        out string? reason)
    {
        var term = StripTags(actor).Trim();

        if (term.Length == 0)
        {
            reason = "the actor is nothing but a caller-side tag, which names nobody.";
            return false;
        }

        if (Defaulted.IsMatch(term))
        {
            reason = "a defaulted or hard-coded actor is the defect itself: the row reads as attributed and "
                     + "names nobody in particular. Refuse the caller instead — or, if this write genuinely "
                     + "has no human actor, say so in the pin rather than here.";
            return false;
        }

        if (IsDeclaredProvenance(term, source, provenances, out reason))
        {
            return true;
        }

        var identifier = Regex.Match(term, @"^[A-Za-z_]\w*");
        if (!identifier.Success)
        {
            reason = "the actor is not an identifier or a recognised provenance, so nothing here shows it "
                     + "cannot be blank.";
            return false;
        }

        var root = identifier.Value;
        var enclosing = EnclosingMember(source, blocks, site.Index);

        // Checked BEFORE the binding chase, and it is the route the Events/Growth/Margin stamps take: those
        // actors arrive as parameters of a public service member, so no binding in this file settles them and
        // only a refusal on the value that reaches the stamp can. A refusal is accepted only where it can
        // actually have run — textually before the site — because once this branch is load-bearing rather
        // than a fallback, a guard sitting after the construction would prove nothing at all.
        if (enclosing != null)
        {
            var beforeSite = source.Substring(
                enclosing.Value.Open, Math.Max(site.Index - enclosing.Value.Open, 0));

            if (RefusesBlank(beforeSite, root) || CallsDeclaredGuard(beforeSite, root, guards))
            {
                reason = null;
                return true;
            }
        }

        var bindings = BindingsOf(root, source, code).ToList();

        if (bindings.Count > 0)
        {
            var unguarded = bindings.Where(b => !IsDeclaredProvenance(b, source, provenances, out _)).ToList();
            if (unguarded.Count > 0)
            {
                reason = $"`{root}` is bound from an unrecognised source ({Condense(unguarded[0])}), so it "
                         + "may be blank at this site.";
                return false;
            }

            // A binding this file controls only settles the value while no OTHER file can supply one under
            // the same name. A public member taking the actor as a parameter is exactly that hole, so it is
            // required to be private and judged with its callers.
            if (enclosing != null && IsParameterOf(source, enclosing.Value, root)
                                  && !Regex.IsMatch(MemberHeaderText(source, enclosing.Value.Open), @"\bprivate\b"))
            {
                reason = $"`{root}` arrives as a parameter of a non-private member, so a caller outside this "
                         + "file decides whether it is blank. Make the staging member private, or guard the "
                         + "parameter here.";
                return false;
            }

            reason = null;
            return true;
        }

        if (enclosing == null)
        {
            reason = "the enclosing member could not be determined, so neither the actor's binding nor a "
                     + "local refusal can be read. Bind the actor from a recognised provenance.";
            return false;
        }

        reason = $"`{root}` is neither bound from a recognised provenance nor refused ahead of this stamp by "
                 + "`if (string.IsNullOrWhiteSpace(...)) throw`. IsNullOrEmpty does not count: it only holds "
                 + "while some caller happens never to pass whitespace.";
        return false;
    }

    /// <summary>
    /// A module-declared guard method applied to the actor — <c>RequireAttributed(userId)</c> — which is how
    /// a service refuses an actor that arrived already-resolved from a controller without repeating the
    /// <c>if</c> at every stamp. Accepted only because
    /// <c>ModuleAuditActorCallSiteTests.Every_declared_actor_guard_refuses_a_blank_it_is_handed</c> pins each
    /// declaration to an <c>IsNullOrWhiteSpace</c> refusal, exactly as the resolver convention is pinned.
    /// </summary>
    private static bool CallsDeclaredGuard(string body, string identifier, IReadOnlyList<string> guards) =>
        guards.Any(guard => Regex.IsMatch(
            body, @"\b" + Regex.Escape(guard) + @"\s*\(\s*" + Regex.Escape(identifier) + @"\s*[,)]"));

    /// <summary>
    /// An explicit refusal of <paramref name="identifier"/> in <paramref name="body"/>. Deliberately
    /// <c>IsNullOrWhiteSpace</c> only: <c>IsNullOrEmpty</c> admits <c>"   "</c>, which reads as attributed
    /// and names nobody, so accepting it would hold only while some caller happens never to pass whitespace.
    /// </summary>
    public static bool RefusesBlank(string body, string identifier) =>
        Regex.IsMatch(
            body,
            @"if\s*\(\s*string\.IsNullOrWhiteSpace\(\s*" + Regex.Escape(identifier)
            + @"\s*\)\s*\)\s*\{[^{}]*throw\b")
        || Regex.IsMatch(
            body,
            @"if\s*\(\s*string\.IsNullOrWhiteSpace\(\s*" + Regex.Escape(identifier)
            + @"\s*\)\s*\)\s*throw\b");

    private static bool IsDeclaredProvenance(
        string expression, string source, IReadOnlyList<ActorProvenance> provenances, out string? reason)
    {
        // Checked ahead of every provenance, not only at the top level: a defaulted term stays defaulted
        // however well the rest of the expression matches something recognised.
        if (Regex.IsMatch(expression, @"\?\?"))
        {
            reason = "a defaulted actor cannot be trusted.";
            return false;
        }

        var trimmed = expression.Trim();
        foreach (var provenance in provenances)
        {
            if (provenance.Accepts(trimmed, source, out var why))
            {
                reason = null;
                return true;
            }

            // A provenance that RECOGNISED the shape but rejected the specifics gives the better message.
            if (why != null && why != "no recognised provenance.")
            {
                reason = why;
                return false;
            }
        }

        reason = "no recognised provenance.";
        return false;
    }

    private static string StripTags(string expression)
    {
        var term = expression;
        while (true)
        {
            var stripped = LiteralTagPrefix.Replace(term, string.Empty, 1);
            if (stripped == term)
            {
                return term;
            }

            term = stripped;
        }
    }
}
