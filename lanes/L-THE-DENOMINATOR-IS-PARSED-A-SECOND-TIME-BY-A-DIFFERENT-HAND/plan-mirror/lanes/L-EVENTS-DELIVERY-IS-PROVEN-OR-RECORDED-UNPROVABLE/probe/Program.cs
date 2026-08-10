using MailKit.Net.Smtp;
using MailKit.Security;

// Replicates EmailService.MailKitSmtpTransport exactly: default SmtpClient (no
// ServerCertificateValidationCallback), SecureSocketOptions.SslOnConnect.
var host = args.Length > 0 ? args[0] : "send.one.com";
var port = args.Length > 1 ? int.Parse(args[1]) : 465;
var mode = args.Length > 2 ? args[2] : "connect";

using var client = new SmtpClient();
if (Environment.GetEnvironmentVariable("PROBE_NO_REVOCATION") == "1")
{
    client.CheckCertificateRevocation = false;
}
if (Environment.GetEnvironmentVariable("PROBE_ACCEPT_CERT") == "1")
{
    // Stands in for a dev-only ServerCertificateValidationCallback that the product transport does not
    // have. Present here solely to isolate which blocker is which.
    client.ServerCertificateValidationCallback = (s, c, h, e) => true;
}
Console.WriteLine($"probe host={host} port={port} mode={mode} checkRevocation={client.CheckCertificateRevocation}");
try
{
    await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
    Console.WriteLine($"CONNECT ok secure={client.IsSecure} caps={client.Capabilities}");
}
catch (Exception ex)
{
    Console.WriteLine($"CONNECT failed type={ex.GetType().Name}");
    Console.WriteLine($"CONNECT failed inner={ex.InnerException?.GetType().Name} msg={ex.Message}");
    return 2;
}

if (mode == "connect")
{
    await client.DisconnectAsync(true);
    Console.WriteLine("DISCONNECT ok");
    return 0;
}

// mode == "send": authenticate with a throwaway label the capture server accepts unconditionally,
// then post one message. No real mailbox and no real credential is involved on either side.
try
{
    await client.AuthenticateAsync("noreply@okam.no", Environment.GetEnvironmentVariable("PROBE_SMTP_SECRET") ?? "");
    Console.WriteLine("AUTH ok");
}
catch (Exception ex)
{
    Console.WriteLine($"AUTH failed type={ex.GetType().Name} msg={ex.Message}");
    return 3;
}

var msg = new MimeKit.MimeMessage();
msg.From.Add(MimeKit.MailboxAddress.Parse("noreply@okam.no"));
msg.To.Add(MimeKit.MailboxAddress.Parse("guest@events-proof.invalid"));
msg.Subject = "Tilbud pa arrangementet ditt - SmtpProbe";
msg.Body = new MimeKit.BodyBuilder { HtmlBody = "<p>probe</p>" }.ToMessageBody();
try
{
    await client.SendAsync(msg);
    Console.WriteLine($"SEND ok messageId={msg.MessageId}");
}
catch (Exception ex)
{
    Console.WriteLine($"SEND failed type={ex.GetType().Name} msg={ex.Message}");
    return 4;
}
await client.DisconnectAsync(true);
Console.WriteLine("DISCONNECT ok");
return 0;
