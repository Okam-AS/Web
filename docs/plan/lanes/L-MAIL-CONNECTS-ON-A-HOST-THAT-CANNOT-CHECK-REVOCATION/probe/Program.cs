using System;
using System.Net.Http;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WebApi.Helpers;
using WebApi.Services;
using WebApi.Services.Interfaces;

namespace SmtpConnectProbe
{
    // Four arms against one endpoint, on this host, in one process. Arms 0 and 1 must fail and arm 2 must
    // succeed, or the probe exits non-zero: "reds against the bare client" is a checked property of the run
    // and not a claim about it.
    //
    // Arms 0-2 stop at ConnectAsync/DisconnectAsync. No credential is offered to the provider at any point:
    // a deliberate failed AUTH against a real mailbox is how an account gets locked, and the question here
    // is only whether the TLS handshake completes.
    //
    // Usage: dotnet run -- <host> <port>
    public static class Program
    {
        public static async Task<int> Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.Error.WriteLine("usage: dotnet run -- <host> <port>");
                return 64;
            }

            var host = args[0];
            var port = int.Parse(args[1]);
            Console.WriteLine("probe host=" + host + " port=" + port + " options=SslOnConnect mailkit=" +
                typeof(SmtpClient).Assembly.GetName().Version);
            Console.WriteLine("product assembly=" + typeof(EmailService).Assembly.Location);
            Console.WriteLine();

            var arm0 = await Arm("arm0 bare client, trunk's construction verbatim: new SmtpClient()",
                () => new BareClientTransport(configureRevocation: null), host, port);

            var arm1 = await Arm("arm1 product transport via EmailService.CreateTransport, setting UNSET",
                () => ProductTransport(revocation: null), host, port);

            var arm2 = await Arm("arm2 product transport via EmailService.CreateTransport, setting FALSE",
                () => ProductTransport(revocation: false), host, port);

            // Corroboration only: ISmtpTransport deliberately exposes nothing but the four SMTP verbs, so
            // the session's own view of the handshake is read from bare clients configured the same way.
            await NameTheChainFlag(host, port);
            await Corroborate(host, port);

            var ok = arm0 == Outcome.Failed && arm1 == Outcome.Failed && arm2 == Outcome.Connected;
            Console.WriteLine();
            Console.WriteLine("VERDICT " + (ok ? "PASS" : "FAIL") +
                " (expected arm0=Failed arm1=Failed arm2=Connected; got arm0=" + arm0 + " arm1=" + arm1 + " arm2=" + arm2 + ")");
            return ok ? 0 : 1;
        }

        private enum Outcome { Connected, Failed }

        private static async Task<Outcome> Arm(string label, Func<ISmtpTransport> build, string host, int port)
        {
            Console.WriteLine("=== " + label);
            using (var transport = build())
            {
                try
                {
                    await transport.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
                    Console.WriteLine("CONNECT ok  transport=" + transport.GetType().FullName);
                    await transport.DisconnectAsync(true);
                    Console.WriteLine("DISCONNECT ok");
                    Console.WriteLine();
                    return Outcome.Connected;
                }
                catch (Exception ex)
                {
                    Console.WriteLine("CONNECT failed type=" + ex.GetType().Name);
                    Console.WriteLine("CONNECT failed msg=" + FirstLines(ex));
                    Console.WriteLine();
                    return Outcome.Failed;
                }
            }
        }

        // Why the handshake was refused, in the chain's own words rather than the exception's summary. Only
        // the status flags are printed: the certificate itself is material this lane does not record.
        private static async Task NameTheChainFlag(string host, int port)
        {
            Console.WriteLine("=== arm3a what the chain actually said, with the check left on");
            using (var client = new SmtpClient())
            {
                // A reporting callback, not a bypass: it prints the flags and then returns the same verdict
                // .NET reached, so this arm is still expected to fail. It lives in the probe and not in the
                // product for exactly that reason.
                client.ServerCertificateValidationCallback = (sender, certificate, chain, errors) =>
                {
                    Console.WriteLine("policy errors = " + errors);
                    if (chain != null)
                        foreach (var element in chain.ChainStatus)
                            Console.WriteLine("chain status  = " + element.Status + " (" + element.StatusInformation.Trim() + ")");
                    return errors == System.Net.Security.SslPolicyErrors.None;
                };

                try
                {
                    await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
                    Console.WriteLine("CONNECT ok — this host CAN complete the revocation check");
                    await client.DisconnectAsync(true);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("CONNECT failed type=" + ex.GetType().Name);
                }
            }
            Console.WriteLine();
        }

        private static async Task Corroborate(string host, int port)
        {
            Console.WriteLine("=== arm3 corroboration: is the session actually secured, and is AUTH offered");
            using (var client = new SmtpClient { CheckCertificateRevocation = false })
            {
                try
                {
                    await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
                    Console.WriteLine("CONNECT ok secure=" + client.IsSecure + " caps=" + client.Capabilities);
                    await client.DisconnectAsync(true);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("CONNECT failed type=" + ex.GetType().Name);
                }
            }
        }

        // The real EmailService, unoverridden, so the transport under test is the one a live send builds.
        private static ISmtpTransport ProductTransport(bool? revocation) =>
            new TransportProbeEmailService(new AppSettings
            {
                SmtpHost = "unused-by-this-probe.invalid",
                SmtpPort = "465",
                SmtpFromEmail = "noreply@okam.example",
                SmtpCheckCertificateRevocation = revocation
            }).Create();

        private sealed class TransportProbeEmailService : EmailService
        {
            public TransportProbeEmailService(AppSettings appSettings)
                : base(new UnusedHttpClientFactory(), NullLogger<EmailService>.Instance, Options.Create(appSettings))
            {
            }

            public ISmtpTransport Create() => CreateTransport();
        }

        // Trunk's MailKitSmtpTransport, reproduced here because trunk's is nested and private. Its only job
        // is to hold the "before" behaviour still while the after behaviour is measured beside it.
        private sealed class BareClientTransport : ISmtpTransport
        {
            private readonly SmtpClient _client = new SmtpClient();

            public BareClientTransport(bool? configureRevocation)
            {
                if (configureRevocation.HasValue)
                    _client.CheckCertificateRevocation = configureRevocation.Value;
            }

            public Task ConnectAsync(string host, int port, SecureSocketOptions options) =>
                _client.ConnectAsync(host, port, options);

            public Task AuthenticateAsync(string userName, string password) =>
                throw new InvalidOperationException("This probe never offers a credential.");

            public Task SendAsync(MimeKit.MimeMessage message) =>
                throw new InvalidOperationException("This probe never sends a message.");

            public Task DisconnectAsync(bool quit) => _client.DisconnectAsync(quit);

            public void Dispose() => _client.Dispose();
        }

        private sealed class UnusedHttpClientFactory : IHttpClientFactory
        {
            public HttpClient CreateClient(string name) =>
                throw new InvalidOperationException("No path exercised by this probe issues an HTTP request.");
        }

        // MailKit puts the reason chain in its own Message; the inner AuthenticationException only says the
        // callback rejected the certificate, which names nothing.
        private static string FirstLines(Exception ex)
        {
            var text = ex.Message;
            if (ex.InnerException != null)
                text += " [inner " + ex.InnerException.GetType().Name + "]";
            return text.Replace("\r", string.Empty).Replace("\n", " | ").Replace("  ", " ");
        }
    }
}
