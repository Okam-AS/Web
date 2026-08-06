// Standalone reproduction of the ESC/POS payer line at feature/restaurant-modules @ 8e2b57de.
// Every method below is copied VERBATIM from that ref:
//   Enums/PaymentType.cs                     -> enum PaymentType
//   Services/Kassa/EscPosReceiptBuilder.cs   -> Width, PaymentLabel, Row, Fit, Money, Clean, Line
// Nothing is paraphrased; the point is to print the actual bytes rather than argue about them.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace proof
{
    // VERBATIM from 8e2b57de:Enums/PaymentType.cs
    public enum PaymentType
    {
        NotSet = 0,
        Giftcard = 75,
        PayInStore = 100,
        Cash = 110,
        Stripe = 200,
        Vipps = 300,
        Dintero = 400,
        DinteroVipps = 410,
        DinteroBillie = 420,
        DinteroKlarna = 430,
        DinteroKravia = 440,
        DinteroTerminal = 450,
        WoltMarketplace = 500,
        Surfboard = 600,
        SurfboardVipps = 610,
        SurfboardTerminal = 650,
        CompanyAccount = 120,
    }

    // Shape of the client-bound DTO that DOES carry a PaymentType
    // (8e2b57de:Models/Kassa/SettlementModels.cs:18 SettlementAllocationRequest).
    public class SettlementAllocationRequest
    {
        public int Amount { get; set; }
        public PaymentType PaymentType { get; set; }
        public Guid? PaymentTransactionId { get; set; }
        public int? TenderedAmount { get; set; }
    }

    public static class Program
    {
        // VERBATIM from 8e2b57de:Services/Kassa/EscPosReceiptBuilder.cs:19
        private const int Width = 32;

        // VERBATIM :315-329
        private static string PaymentLabel(PaymentType paymentType)
        {
            switch (paymentType)
            {
                case PaymentType.Cash:
                    return "Kontant";
                case PaymentType.SurfboardTerminal:
                case PaymentType.DinteroTerminal:
                    return "Kort";
                case PaymentType.Giftcard:
                    return "Gavekort";
                default:
                    return paymentType.ToString();
            }
        }

        // VERBATIM :238-252
        private static string Row(string left, string right)
        {
            left = left ?? string.Empty;
            right = right ?? string.Empty;
            var available = Width - right.Length - 1;
            if (available < 0)
            {
                return Fit(right, Width);
            }
            if (left.Length > available)
            {
                left = Fit(left, available);
            }
            return left + new string(' ', Width - left.Length - right.Length) + right;
        }

        // VERBATIM :254-261
        private static string Fit(string text, int width)
        {
            if (string.IsNullOrEmpty(text) || text.Length <= width)
            {
                return text ?? string.Empty;
            }
            return width <= 1 ? text.Substring(0, Math.Max(0, width)) : text.Substring(0, width - 1) + "…";
        }

        // VERBATIM :305-313
        private static string Money(int ore)
        {
            var negative = ore < 0;
            var abs = Math.Abs((long)ore);
            var kroner = abs / 100;
            var rest = abs % 100;
            var grouped = kroner.ToString("N0", CultureInfo.InvariantCulture).Replace(",", " ");
            return (negative ? "-" : string.Empty) + grouped + "," + rest.ToString("00", CultureInfo.InvariantCulture);
        }

        // VERBATIM :197-201 (Clean is identity for these inputs: no control chars)
        private static void Line(List<byte> job, string text)
        {
            job.AddRange(Encoding.UTF8.GetBytes(text));
            job.Add(0x0A);
        }

        private static void EmitPayerLine(PaymentType t, int amountOre)
        {
            var job = new List<byte>();
            Line(job, Row(PaymentLabel(t), Money(amountOre)));
            var bytes = job.ToArray();
            var text = Encoding.UTF8.GetString(bytes, 0, bytes.Length - 1); // drop the 0x0A
            var hex = new StringBuilder();
            foreach (var b in bytes)
            {
                hex.Append(b.ToString("X2")).Append(' ');
            }
            Console.WriteLine("  int={0,-6} ToString()={1,-18} printed=|{2}|",
                (int)t, "\"" + t.ToString() + "\"", text);
            Console.WriteLine("      bytes: {0}", hex.ToString().Trim());
        }

        public static void Main()
        {
            Console.OutputEncoding = Encoding.UTF8;

            Console.WriteLine("=== A. Does the enum carry [Flags]? ===");
            var flags = Attribute.IsDefined(typeof(PaymentType), typeof(FlagsAttribute));
            Console.WriteLine("  [Flags] on PaymentType: {0}", flags);
            Console.WriteLine();

            Console.WriteLine("=== B. What a DEFINED but unlabelled member prints on the payer line ===");
            EmitPayerLine(PaymentType.CompanyAccount, 12500);
            EmitPayerLine(PaymentType.NotSet, 12500);
            Console.WriteLine();

            Console.WriteLine("=== C. What an UNDEFINED (out-of-range) value prints on the payer line ===");
            foreach (var raw in new[] { 999, 7, -1, 121, int.MaxValue })
            {
                EmitPayerLine((PaymentType)raw, 12500);
            }
            Console.WriteLine();

            Console.WriteLine("=== D. Enum.IsDefined on those same values ===");
            foreach (var raw in new[] { 999, 7, -1, 121, 120, 110 })
            {
                Console.WriteLine("  IsDefined({0,-6}) = {1}", raw, Enum.IsDefined(typeof(PaymentType), raw));
            }
            Console.WriteLine();

            Console.WriteLine("=== E. Does the app's OWN binder (Newtonsoft + StringEnumConverter, exactly");
            Console.WriteLine("       Helpers/ServiceCollectionExtensions.cs:168-172) accept an out-of-range int? ===");
            var settings = new JsonSerializerSettings();
            settings.Converters.Add(new StringEnumConverter());
            settings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;

            foreach (var body in new[]
            {
                "{\"Amount\":12500,\"PaymentType\":999}",
                "{\"Amount\":12500,\"PaymentType\":7}",
                "{\"Amount\":12500,\"PaymentType\":\"999\"}",
                "{\"Amount\":12500,\"PaymentType\":\"Bogus\"}",
                "{\"Amount\":12500,\"PaymentType\":120}",
            })
            {
                try
                {
                    var dto = JsonConvert.DeserializeObject<SettlementAllocationRequest>(body, settings);
                    Console.WriteLine("  {0,-46} -> bound as int={1} ToString()=\"{2}\"",
                        body, (int)dto.PaymentType, dto.PaymentType);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("  {0,-46} -> REJECTED: {1}", body, ex.GetType().Name);
                }
            }
            Console.WriteLine();

            Console.WriteLine("=== F. EF EnumToStringConverter round-trip (Order/PaymentTransaction/Cart columns) ===");
            foreach (var raw in new[] { 999, 120 })
            {
                var stored = ((PaymentType)raw).ToString();
                var read = (PaymentType)Enum.Parse(typeof(PaymentType), stored);
                Console.WriteLine("  {0,-6} -> column value \"{1}\" -> read back int={2}", raw, stored, (int)read);
            }
        }
    }
}
