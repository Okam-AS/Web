using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Enums;
using WebApi.Helpers;
using WebApi.Models.Kassa;
using WebApi.Services;
using WebApi.Services.Kassa;
using Xunit;

namespace WebApi.Tests.Kassa;

// A venue produces two documents for one sale — the ESC/POS roll handed over the counter (and the
// X/Z summary that closes its day) and the PDF kvittering mailed to the customer — and each of them
// carries a payer line that names the tender. Both emitters answered a value they had no arm for
// with something meaningless rather than refusing: the roll printed the C# identifier, so a company
// credit sale put the English word "CompanyAccount" on a Norwegian § 2-8-7 utleveringskvittering,
// and the PDF printed string.Empty, so six tenders the product can actually produce mailed a
// receipt showing an amount beside a blank payer.
//
// They are covered in one file on purpose. The two defects diverged in the first place because each
// was looked at through its own artifact, and a check that covers one emitter cannot see the
// failure mode that matters most here — the two documents for one sale disagreeing about what was
// tendered. The_two_documents_group_tenders_identically is that check.
//
// Every assertion reads an artifact rather than a helper's return value: the roll labels come off
// the printed bytes of a real job, and the PDF label comes off ReceiptModel.Receipt.PayedWith, the
// field handed to IDocumentRenderer. Nothing here names API that the fix added, so the file
// compiles and runs against an unmodified tree and is its own negative control on both emitters.
public sealed class PrintedTenderNameTests : IClassFixture<PrintedTenderNameTests.EmailedReceipts>
{
    private readonly EmailedReceipts _emailed;

    public PrintedTenderNameTests(EmailedReceipts emailed) => _emailed = emailed;

    // Distinct from the receipt's gross (125,00) and from every zeroed X-report figure (0,00), so on
    // either job the payer row is the only line that ends with it.
    private const int PayerOre = 4237;
    private const string PayerAmount = "42,37";

    // The word both documents print for a value that is not a declared PaymentType. FinalizeService
    // copies PaymentType straight off a request DTO with no membership guard and an int-backed enum
    // property binds any number, so such a value reaches a printed payer line. "Ukjent" is the
    // estate's existing residual (CartService.cs:1644), not a new answer to an answered question.
    private const string Residual = "Ukjent";

    // The sentence the emailed PDF must carry for each declared member, written longhand rather than
    // resolved through the production table: a table checked against itself cannot tell an arm that
    // is MISSING from one that is WRONG, because both sides move together on every input.
    //
    // The eleven that already existed are quoted from ReceiptService.PaymentTypeLabel as it stood at
    // the tip, so this file also pins that no wording a customer has already received drifted. The
    // six that were blank are quoted from what already names that tender in this estate in this same
    // sentence register — the admin order list's orders_paymentGiftcard / orders_paymentPayInStore /
    // orders_paymentWolt / orders_paymentCard, the POS refund flow's adverbial "Tilbakebetales
    // kontant", and pos_refund_na_nopayment's "Ingen betaling registrert" for a document carrying an
    // amount against no registered tender.
    private static readonly (PaymentType Type, string PayerLine)[] ExpectedPayerLines =
    {
        (PaymentType.NotSet, "Ingen betaling registrert"),
        (PaymentType.Giftcard, "Betalt med gavekort"),
        (PaymentType.PayInStore, "Betal i butikk"),
        (PaymentType.Cash, "Betalt kontant"),
        (PaymentType.CompanyAccount, "Betalt med bedriftskonto"),
        (PaymentType.Stripe, "Betalt med kort"),
        (PaymentType.Vipps, "Betalt med Vipps"),
        (PaymentType.Dintero, "Betalt med kort"),
        (PaymentType.DinteroVipps, "Betalt med Vipps"),
        (PaymentType.DinteroBillie, "Betalt med Billie"),
        (PaymentType.DinteroKlarna, "Betalt med Klarna"),
        (PaymentType.DinteroKravia, "Betalt med Kravia"),
        (PaymentType.DinteroTerminal, "Betalt med kort"),
        (PaymentType.WoltMarketplace, "Betalt via Wolt"),
        (PaymentType.Surfboard, "Betalt med kort"),
        (PaymentType.SurfboardVipps, "Betalt med Vipps"),
        (PaymentType.SurfboardTerminal, "Betalt med kort"),
    };

    // The one member whose correct roll noun is byte-identical to its C# identifier: "Vipps" is what
    // the PDF and WrappedService.GetPaymentTypeName already print for it, and a different word would
    // be a new answer to a settled question. No output-level assertion can separate "labelled" from
    // "fell through the default" for it on the roll, so its arm is proven by the residual check
    // instead. Named here so a future rename cannot quietly join it.
    private static readonly PaymentType[] RollNounEqualsIdentifier = { PaymentType.Vipps };

    public static IEnumerable<object[]> DeclaredPayerLines()
        => ExpectedPayerLines.Select(e => new object[] { e.Type, e.PayerLine });

    // The exit criterion on the emailed PDF, read off the model handed to the renderer. Reds at the
    // tip for the six members that reach the empty default — NotSet, Giftcard, PayInStore, Cash,
    // DinteroTerminal and WoltMarketplace.
    [Theory]
    [MemberData(nameof(DeclaredPayerLines))]
    public void The_emailed_receipt_names_the_tender_in_a_Norwegian_sentence(PaymentType type, string payerLine)
    {
        Assert.Equal(payerLine, _emailed.PayerLine(type));
    }

    // The exit criterion, stated as the two things a payer line must never be. Blank is the worse of
    // the pair because it is indistinguishable from a rendering fault: an amount prints, no tender
    // does, and nothing anywhere reds.
    [Fact]
    public void No_declared_tender_prints_an_empty_payer_line_or_a_raw_enum_name()
    {
        foreach (var type in Declared())
        {
            Assert.False(string.IsNullOrWhiteSpace(_emailed.PayerLine(type)));
            Assert.False(string.IsNullOrWhiteSpace(RollNoun(type)));

            Assert.NotEqual(type.ToString(), _emailed.PayerLine(type));
            if (!RollNounEqualsIdentifier.Contains(type))
            {
                Assert.NotEqual(type.ToString(), RollNoun(type));
            }
        }
    }

    // The mechanism rather than the members that were noticed. PaymentType.CompanyAccount was added
    // to the enum "additive, code-only" and no emitter was widened; on the roll it surfaced as an
    // English word and on the PDF as nothing at all. A member added tomorrow with no arm of its own
    // falls to the residual on both and reds here.
    [Fact]
    public void Every_declared_member_is_labelled_by_its_own_arm_on_both_documents()
    {
        foreach (var type in Declared())
        {
            Assert.NotEqual(Residual, _emailed.PayerLine(type));
            Assert.NotEqual(Residual, RollNoun(type));
        }
    }

    // The other half of that guard: a new member reds here until somebody states the Norwegian
    // sentence it must print, so the expectations cannot silently fall behind the enum either.
    [Fact]
    public void The_expected_payer_lines_cover_exactly_the_declared_members()
    {
        Assert.Equal(
            Declared().OrderBy(t => (int)t).ToArray(),
            ExpectedPayerLines.Select(e => e.Type).OrderBy(t => (int)t).ToArray());
    }

    // Why the two emitters belong in one file. The registers differ on purpose — the roll abbreviates
    // to a noun for its 32 columns, the PDF has room for a sentence — so the words cannot be compared
    // directly. What must agree is the GROUPING: any two tenders the roll calls by one name must be
    // one name on the PDF too, and the other way round. This is what reds if somebody gives
    // DinteroTerminal a card sentence on the PDF while the roll still files it as cash.
    [Fact]
    public void The_two_documents_group_tenders_identically()
    {
        Assert.Equal(Partition(RollNoun), Partition(_emailed.PayerLine));
    }

    // Every tender that reaches a payer line is a real one, so the residual stands for "an int that
    // is not a tender" and nothing else. Both documents must say so with the same word, or one of
    // them is asserting more than it knows.
    [Fact]
    public void An_undefined_payment_type_names_the_same_residual_on_both_documents()
    {
        var undefined = (PaymentType)9999;

        Assert.Equal(Residual, RollNoun(undefined));
        Assert.Equal(Residual, _emailed.PayerLine(undefined));
    }

    // The tenders grouped by the label they print, as a set of sets, so two emitters in different
    // registers can be compared on structure alone.
    private static HashSet<string> Partition(Func<PaymentType, string> label)
        => Declared()
            .GroupBy(label)
            .Select(g => string.Join(",", g.OrderBy(t => (int)t).Select(t => ((int)t).ToString())))
            .ToHashSet();

    private static IEnumerable<PaymentType> Declared()
        => Enum.GetValues(typeof(PaymentType)).Cast<PaymentType>();

    // The roll's label as printed: the left-hand side of the only 32-column row ending with the payer
    // amount. Read off the bytes rather than off the model, so the pin cannot be satisfied by a label
    // nothing renders.
    private static string RollNoun(PaymentType type)
    {
        var row = Assert.Single(
            TextLines(EscPosReceiptBuilder.Build(Receipt(type)))
                .Where(l => l.EndsWith(PayerAmount, StringComparison.Ordinal)));
        return row.Substring(0, row.Length - PayerAmount.Length).TrimEnd();
    }

    private static PosReceiptModel Receipt(PaymentType type)
    {
        return new PosReceiptModel
        {
            JournalEntryId = 1,
            Title = "Salgskvittering",
            ReceiptNumber = 42,
            RegisterId = "REG-1",
            OperatorName = "Ola",
            SellerLegalName = "Okam AS",
            SellerOrgNumber = "Org.nr. 925 024 414 MVA",
            SellerAddress = "Thorvald Meyers gate 83A, 0552 Oslo",
            LocalDate = "05.08.2026",
            LocalTime = "12:00",
            Currency = "NOK",
            GrossAmount = 12500,
            NetAmount = 10000,
            VatAmount = 2500,
            Lines = new List<PosReceiptLineModel>
            {
                new PosReceiptLineModel { LineNumber = 1, ProductName = "Kaffe", Quantity = 1, UnitAmount = 12500, LineAmount = 12500, VatPercent = 25 }
            },
            TaxLines = new List<PosReceiptTaxLineModel>
            {
                new PosReceiptTaxLineModel { VatPercent = 25, Basis = 10000, Amount = 2500 }
            },
            Payments = new List<PosReceiptPaymentLineModel>
            {
                new PosReceiptPaymentLineModel { PaymentType = type, Amount = PayerOre }
            }
        };
    }

    // Drops the command sequences the builder emits (ESC @, ESC a, ESC !, ESC d, ESC -, GS !, GS V)
    // and splits the remaining UTF-8 text on LF. Kept local, as in EscPosPaymentLabelTests, so this
    // file runs unchanged against an unmodified tree — which is the whole point of it.
    private static List<string> TextLines(byte[] job)
    {
        var text = new List<byte>();
        for (var i = 0; i < job.Length; i++)
        {
            if (job[i] == 0x1B)
            {
                i += job[i + 1] == 0x40 || job[i + 1] == 0x32 ? 1 : 2;
            }
            else if (job[i] == 0x1D)
            {
                i += 2;
            }
            else
            {
                text.Add(job[i]);
            }
        }
        return Encoding.UTF8.GetString(text.ToArray()).Split('\n').ToList();
    }

    // Builds one real emailed-receipt model per PaymentType through ReceiptService.GetReceiptModel
    // and keeps the payer line each one carries.
    //
    // The giftcard receipt is used because it is the shortest honest path to the artifact: it reads
    // the tender straight off the persisted row and needs no order graph, so the label is observed on
    // ReceiptModel.Receipt.PayedWith — the field GeneratePdf hands to IDocumentRenderer — rather than
    // on the private ladder that produces it. The order receipt fills the same field from the same
    // call. Sqlite in memory, one schema build for the whole class; no container and no SQL Server.
    public sealed class EmailedReceipts : IAsyncLifetime
    {
        private readonly Dictionary<PaymentType, string> _payerLines = new();
        private SqliteConnection? _connection;

        public string PayerLine(PaymentType type) => _payerLines[type];

        public async Task InitializeAsync()
        {
            // Foreign keys off: the fixture asserts on a label derived from one column, and a giftcard
            // row that satisfied every relationship in the schema would prove nothing more.
            _connection = new SqliteConnection("DataSource=:memory:;Foreign Keys=False");
            await _connection.OpenAsync();
            var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(_connection).Options;
            using var context = new ApplicationDbContext(options);
            await context.Database.EnsureCreatedAsync();

            var types = Declared().Append((PaymentType)9999).ToArray();
            var ids = new Dictionary<PaymentType, Guid>();
            foreach (var type in types)
            {
                var id = Guid.NewGuid();
                ids[type] = id;
                context.Giftcards.Add(new Giftcard
                {
                    GiftcardId = id,
                    Created = new DateTime(2026, 8, 5, 12, 0, 0),
                    Status = GiftcardStatus.Completed,
                    PaymentType = type,
                    StoreId = 1,
                    StoreLegalName = "Okam AS",
                    StoreVAT = 925024414,
                    StoreFullAddress = "Thorvald Meyers gate 83A",
                    StoreZipCode = "0552",
                    StoreCity = "Oslo",
                    FinalAmount = PayerOre
                });
            }
            await context.SaveChangesAsync();

            // GetReceiptModel(Guid) reads the context and nothing else; the renderer, mailer and order
            // builder belong to paths this fixture does not walk.
            var service = new ReceiptService(null!, context, null!, null!);
            foreach (var type in types)
            {
                var model = await service.GetReceiptModel(ids[type]);
                _payerLines[type] = model.Receipt.PayedWith;
            }
        }

        public async Task DisposeAsync()
        {
            if (_connection != null)
            {
                await _connection.DisposeAsync();
            }
        }
    }
}
