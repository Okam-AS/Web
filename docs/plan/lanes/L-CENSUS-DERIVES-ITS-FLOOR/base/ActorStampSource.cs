using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace WebApi.Tests.Modules;

/// <summary>
/// The source geometry the actor-stamp convention is read with: which byte indexes are executable code,
/// where the braces balance, which member encloses an index, and what a named local is bound from.
///
/// <para>Extracted verbatim from <c>MealsAuditActorCallSiteTests</c>'s private half so five modules share one
/// analysis instead of five copies of it. Nothing here knows about a module: it answers questions about C#
/// text. <see cref="ModuleActorStampPin"/> holds what each module declares, and
/// <see cref="ActorStampRule"/> holds the fail-closed judgement.</para>
///
/// <para><b>Why regex over Roslyn.</b> The pin has to run in the fast suite on every build with no
/// compilation step and no analyzer package, and it has to be readable by the person whose new call site it
/// just failed. The masking below is what makes text analysis honest rather than approximate: a brace, a
/// quote or the word <c>throw</c> inside a string or a comment can neither unbalance the block scan nor
/// satisfy a guard.</para>
/// </summary>
internal static class ActorStampSource
{
    internal readonly record struct Span(int Open, int Close);

    /// <summary>A construction of the stamped type, with its object initializer's braces when it has one.</summary>
    internal readonly record struct Site(int Index, Span? Initializer);

    // ---- scope ---------------------------------------------------------------------------------------

    /// <summary>
    /// Every hand-written source file of the API project.
    ///
    /// <para>The TEST project is excluded because its probes construct entries with blank actors on purpose,
    /// to drive the writers' nets. <c>Migrations/</c> is excluded because it is GENERATED: a migration names
    /// the actor COLUMN — <c>ActorUserId = table.Column&lt;string&gt;(...)</c> — which is a schema declaration
    /// and not a stamp, and unlike the Meals ancestor of this convention (whose scope type was a DTO that
    /// never appears in a migration) several of these modules stamp entities directly, so their type names do.
    /// A stamp cannot hide there: a migration constructs no entity and calls no service.</para>
    /// </summary>
    public static IEnumerable<string> ProductionSources(string repoRoot) =>
        Directory.EnumerateFiles(repoRoot, "*.cs", SearchOption.AllDirectories)
            .Where(f => !Relative(repoRoot, f).Split('/')
                .Any(segment => segment is "bin" or "obj" or "WebApi.Tests" or "Migrations"));

    /// <summary>
    /// The files in scope for a module: those that so much as mention <paramref name="scopeMarker"/>. Derived,
    /// never a path list — a hand-maintained list of service paths is the same class of bug the convention
    /// exists to catch, because it silently stops covering code somebody put somewhere else.
    /// </summary>
    public static IEnumerable<string> FilesMentioning(string repoRoot, string scopeMarker) =>
        ProductionSources(repoRoot)
            .Where(f => File.ReadAllText(f).Contains(scopeMarker, StringComparison.Ordinal));

    public static string Relative(string repoRoot, string file) =>
        Path.GetRelativePath(repoRoot, file).Replace('\\', '/');

    // ---- sites ---------------------------------------------------------------------------------------

    /// <summary>Every construction of <paramref name="newTypePattern"/> that is real code.</summary>
    public static IEnumerable<Site> Sites(string source, bool[] code, IReadOnlyList<Span> blocks, Regex newTypePattern)
    {
        foreach (Match match in newTypePattern.Matches(source))
        {
            if (!code[match.Index])
            {
                continue;
            }

            var open = FirstNonWhitespace(source, match.Index + match.Length);
            var initializer = open >= 0 && source[open] == '{'
                ? blocks.FirstOrDefault(b => b.Open == open)
                : default;

            yield return new Site(match.Index, initializer.Close > 0 ? initializer : null);
        }
    }

    /// <summary>The expression assigned to <paramref name="actorProperty"/> inside a site's initializer, or null.</summary>
    public static string? ActorExpression(string source, bool[] code, Site site, string actorProperty)
    {
        var span = site.Initializer!.Value;
        foreach (Match match in Regex.Matches(source, ActorAssignmentPattern(actorProperty)))
        {
            if (match.Index <= span.Open || match.Index >= span.Close || !code[match.Index])
            {
                continue;
            }

            return ReadExpression(source, code, match.Index + match.Length, span.Close);
        }

        return null;
    }

    /// <summary>An assignment TO the actor property, never a comparison against it.</summary>
    public static string ActorAssignmentPattern(string actorProperty) =>
        @"\b" + Regex.Escape(actorProperty) + @"\s*=\s*(?!=)";

    /// <summary>Reads to the comma that ends an initializer member, ignoring commas nested in a call.</summary>
    public static string ReadExpression(string source, bool[] code, int start, int limit)
    {
        var depth = 0;
        for (var i = start; i < limit; i++)
        {
            if (!code[i])
            {
                continue;
            }

            var c = source[i];
            if (c == '(' || c == '[' || c == '{')
            {
                depth++;
            }
            else if (c == ')' || c == ']' || c == '}')
            {
                if (depth == 0)
                {
                    return source.Substring(start, i - start);
                }

                depth--;
            }
            else if (c == ',' && depth == 0)
            {
                return source.Substring(start, i - start);
            }
        }

        return source.Substring(start, limit - start);
    }

    // ---- bindings and members ------------------------------------------------------------------------

    /// <summary>Right-hand sides of every statement-position binding of <paramref name="identifier"/>.</summary>
    public static IEnumerable<string> BindingsOf(string identifier, string source, bool[] code)
    {
        var pattern = new Regex(@"(?<=[;{}])\s*(?:(?:var|string)\s+)?" + Regex.Escape(identifier)
                                + @"\s*=\s*(?!=)(?<rhs>[^;]*);");
        foreach (Match match in pattern.Matches(source))
        {
            if (code[match.Groups["rhs"].Index])
            {
                yield return match.Groups["rhs"].Value;
            }
        }
    }

    public static bool IsParameterOf(string source, Span member, string identifier)
    {
        var header = MemberHeaderText(source, member.Open);
        var parameters = header.LastIndexOf('(');
        return parameters >= 0
               && Regex.IsMatch(header.Substring(parameters), @"\b" + Regex.Escape(identifier) + @"\b");
    }

    /// <summary>
    /// Declaration bodies of every <c>string &lt;name&gt;(...)</c> in a file, expression- or block-bodied, so a
    /// resolver can be judged where it lives rather than where it is called.
    /// </summary>
    public static List<string> ResolverDeclarations(string source, string resolverName)
    {
        var declarations = new List<string>();
        foreach (Match match in Regex.Matches(source, @"\bstring\s+" + Regex.Escape(resolverName) + @"\s*\([^)]*\)"))
        {
            var tail = source.Substring(match.Index + match.Length);
            var brace = tail.IndexOf('{');
            var semicolon = tail.IndexOf(';');
            if (semicolon < 0)
            {
                continue;
            }

            declarations.Add(brace >= 0 && brace < semicolon
                ? tail.Substring(0, MatchingBraceIn(tail, brace) + 1)
                : tail.Substring(0, semicolon + 1));
        }

        return declarations;
    }

    /// <summary>
    /// The innermost block containing <paramref name="index"/> whose header reads as a member declaration.
    /// Stamps sit inside lambdas handed to an idempotency composition, so this walks out several levels.
    /// </summary>
    public static Span? EnclosingMember(string source, IReadOnlyList<Span> blocks, int index)
    {
        foreach (var block in blocks.Where(b => b.Open < index && index < b.Close).OrderByDescending(b => b.Open))
        {
            if (MemberHeader.IsMatch(MemberHeaderText(source, block.Open)))
            {
                return block;
            }
        }

        return null;
    }

    // A signature, not a lambda / if / try / initializer: an access modifier, then a parameter list, then
    // nothing but whitespace before the brace.
    private static readonly Regex MemberHeader = new(
        @"\b(?:public|private|protected|internal)\b[^=;]*\([^;]*\)\s*$",
        RegexOptions.Compiled | RegexOptions.Singleline);

    public static string MemberHeaderText(string source, int open)
    {
        var start = source.LastIndexOfAny(new[] { ';', '{', '}' }, Math.Max(open - 1, 0));
        return source.Substring(start + 1, open - start - 1);
    }

    // ---- masking and braces --------------------------------------------------------------------------

    /// <summary>
    /// True at every index that is executable code. Built once per file so a brace, a quote or the word
    /// <c>throw</c> inside a string or a comment can neither unbalance the block scan nor satisfy a guard.
    /// </summary>
    public static bool[] CodeMask(string source)
    {
        var mask = new bool[source.Length];
        var i = 0;
        while (i < source.Length)
        {
            var c = source[i];
            if (c == '/' && i + 1 < source.Length && source[i + 1] == '/')
            {
                while (i < source.Length && source[i] != '\n')
                {
                    i++;
                }

                continue;
            }

            if (c == '/' && i + 1 < source.Length && source[i + 1] == '*')
            {
                var end = source.IndexOf("*/", i + 2, StringComparison.Ordinal);
                i = end < 0 ? source.Length : end + 2;
                continue;
            }

            if (c == '"')
            {
                mask[i] = true; // the opening quote is code, so a literal is still recognisable as one
                i = EndOfString(source, i);
                continue;
            }

            if (c == '\'')
            {
                mask[i] = true;
                i = EndOfChar(source, i);
                continue;
            }

            mask[i] = true;
            i++;
        }

        return mask;
    }

    private static int EndOfString(string source, int quote)
    {
        var verbatim = false;
        for (var back = quote - 1; back >= 0 && (source[back] == '@' || source[back] == '$'); back--)
        {
            verbatim |= source[back] == '@';
        }

        var i = quote + 1;
        while (i < source.Length)
        {
            if (source[i] == '\\' && !verbatim)
            {
                i += 2;
                continue;
            }

            if (source[i] == '"')
            {
                if (verbatim && i + 1 < source.Length && source[i + 1] == '"')
                {
                    i += 2;
                    continue;
                }

                return i + 1;
            }

            i++;
        }

        return source.Length;
    }

    private static int EndOfChar(string source, int quote)
    {
        var i = quote + 1;
        while (i < source.Length)
        {
            if (source[i] == '\\')
            {
                i += 2;
                continue;
            }

            if (source[i] == '\'')
            {
                return i + 1;
            }

            i++;
        }

        return source.Length;
    }

    public static List<Span> Blocks(string source, bool[] code)
    {
        var open = new Stack<int>();
        var blocks = new List<Span>();
        for (var i = 0; i < source.Length; i++)
        {
            if (!code[i])
            {
                continue;
            }

            if (source[i] == '{')
            {
                open.Push(i);
            }
            else if (source[i] == '}' && open.Count > 0)
            {
                blocks.Add(new Span(open.Pop(), i));
            }
        }

        return blocks;
    }

    private static int MatchingBraceIn(string source, int open)
    {
        var mask = CodeMask(source);
        var depth = 0;
        for (var i = open; i < source.Length; i++)
        {
            if (!mask[i])
            {
                continue;
            }

            if (source[i] == '{')
            {
                depth++;
            }
            else if (source[i] == '}' && --depth == 0)
            {
                return i;
            }
        }

        return source.Length - 1;
    }

    // ---- reporting -----------------------------------------------------------------------------------

    public static int FirstNonWhitespace(string source, int from)
    {
        for (var i = from; i < source.Length; i++)
        {
            if (!char.IsWhiteSpace(source[i]))
            {
                return i;
            }
        }

        return -1;
    }

    public static int LineOf(string source, int index) =>
        source.Take(index).Count(c => c == '\n') + 1;

    public static string Condense(string expression)
    {
        var flat = string.Join(" ", expression.Split((char[])null!, StringSplitOptions.RemoveEmptyEntries));
        return flat.Length <= 120 ? flat : flat.Substring(0, 120);
    }
}
