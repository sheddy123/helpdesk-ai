using System.Text.RegularExpressions;
using HelpdeskAi.Data;
using HelpdeskAi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpdeskAi.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("inbound-email")]
    public async Task<IActionResult> InboundEmail(
        [FromBody] BrevoWebhookPayload payload,
        [FromQuery] string? secret)
    {
        var configuredSecret = config["Brevo:WebhookSecret"] ?? "";
        if (!string.IsNullOrEmpty(configuredSecret) && secret != configuredSecret)
            return Unauthorized();

        foreach (var email in payload.Items)
        {
            if (!string.IsNullOrEmpty(email.MessageId)
                && await db.Tickets.AnyAsync(t => t.MessageId == email.MessageId))
                continue;

            db.Tickets.Add(new Ticket
            {
                MessageId   = email.MessageId,
                SenderEmail = email.From?.Address ?? "unknown@unknown.invalid",
                Subject     = email.Subject ?? "(no subject)",
                Body        = ExtractBody(email),
                Status      = TicketStatus.Open,
                CreatedAt   = DateTimeOffset.UtcNow
            });
        }

        await db.SaveChangesAsync();
        return Ok();
    }

    private static string ExtractBody(BrevoInboundEmail email)
    {
        if (!string.IsNullOrWhiteSpace(email.RawTextBody))
            return email.RawTextBody.Trim();
        if (!string.IsNullOrWhiteSpace(email.RawHtmlBody))
            return StripHtml(email.RawHtmlBody);
        return email.ExtractedMarkdownMessage?.Trim() ?? "";
    }

    private static string StripHtml(string html)
    {
        var s = Regex.Replace(html,
            @"<(script|style)[^>]*?>.*?</(script|style)>", "",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"<[^>]+>", " ");
        return Regex.Replace(s, @"\s{2,}", " ").Trim();
    }
}

public record BrevoEmailAddress(string? Name, string? Address);

public record BrevoInboundEmail(
    string? MessageId,
    string? Subject,
    BrevoEmailAddress? From,
    string? RawTextBody,
    string? RawHtmlBody,
    string? ExtractedMarkdownMessage);

public record BrevoWebhookPayload(List<BrevoInboundEmail> Items);
