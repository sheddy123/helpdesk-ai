using HelpdeskAi.Data;
using HelpdeskAi.Models;
using MailKit;
using Microsoft.EntityFrameworkCore;
using MailKit.Net.Imap;
using MailKit.Search;
using MimeKit;

namespace HelpdeskAi.Services;

public class EmailPollingService(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<EmailPollingService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var email       = config["Gmail:Email"] ?? "";
        var appPassword = config["Gmail:AppPassword"] ?? "";
        var interval    = int.TryParse(config["Gmail:PollingIntervalSeconds"], out var s) ? s : 60;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(appPassword))
        {
            logger.LogWarning("Gmail credentials not configured — email polling disabled.");
            return;
        }

        logger.LogInformation("Email polling started. Checking {Email} every {Interval}s.", email, interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                //await PollAsync(email, appPassword, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during email poll.");
            }

            await Task.Delay(TimeSpan.FromSeconds(interval), stoppingToken);
        }
    }

    private async Task PollAsync(string email, string appPassword, CancellationToken ct)
    {
        using var client = new ImapClient();
        await client.ConnectAsync("imap.gmail.com", 993, true, ct);
        await client.AuthenticateAsync(email, appPassword, ct);

        var inbox = client.Inbox;
        await inbox.OpenAsync(FolderAccess.ReadWrite, ct);

        var uids = await inbox.SearchAsync(SearchQuery.NotSeen, ct);
        if (uids.Count == 0)
        {
            await client.DisconnectAsync(true, ct);
            return;
        }

        logger.LogInformation("Found {Count} unread email(s).", uids.Count);

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        foreach (var uid in uids.Take(10))      
        {
            var message = await inbox.GetMessageAsync(uid, ct);
            await CreateTicketAsync(db, message, ct);
            await inbox.AddFlagsAsync(uid, MessageFlags.Seen, true, ct);
        }

        await db.SaveChangesAsync(ct);
        await client.DisconnectAsync(true, ct);
    }

    private async Task CreateTicketAsync(AppDbContext db, MimeMessage message, CancellationToken ct)
    {
        var messageId  = message.MessageId;
        var senderAddr = (message.From.Mailboxes.FirstOrDefault()?.Address) ?? "unknown@unknown.invalid";
        var subject    = string.IsNullOrWhiteSpace(message.Subject) ? "(no subject)" : message.Subject;
        var body       = string.IsNullOrWhiteSpace(message.TextBody)
                            ? message.HtmlBody ?? ""
                            : message.TextBody;

        // Skip duplicates
        if (!string.IsNullOrEmpty(messageId)
            && await db.Tickets.AnyAsync(t => t.MessageId == messageId, ct))
        {
            logger.LogDebug("Skipping duplicate MessageId {MessageId}.", messageId);
            return;
        }

        db.Tickets.Add(new Ticket
        {
            MessageId   = messageId,
            SenderEmail = senderAddr,
            Subject     = subject,
            Body        = body.Trim(),
            Status      = TicketStatus.Open,
            CreatedAt   = DateTimeOffset.UtcNow
        });

        logger.LogInformation("Created ticket from {Sender}: {Subject}", senderAddr, subject);
    }
}
