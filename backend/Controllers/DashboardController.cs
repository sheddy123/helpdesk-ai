using HelpdeskAi.Data;
using HelpdeskAi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpdeskAi.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var total = await db.Tickets.CountAsync();
        var open  = await db.Tickets.CountAsync(t => t.Status == TicketStatus.Open);

        var resolvedByAi = await db.Tickets.CountAsync(t =>
            t.AiSuggestedReply != null &&
            (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed));

        var aiPercent = total > 0
            ? Math.Round((double)resolvedByAi / total * 100, 1)
            : 0.0;

        var resolved = await db.Tickets
            .Where(t => t.ResolvedAt.HasValue)
            .Select(t => new { t.CreatedAt, ResolvedAt = t.ResolvedAt!.Value })
            .ToListAsync();

        double? avgMinutes = resolved.Count > 0
            ? resolved.Average(t => (t.ResolvedAt - t.CreatedAt).TotalMinutes)
            : null;

        // Tickets per day — past 30 days
        var cutoff = DateTimeOffset.UtcNow.AddDays(-29).Date; // DateTime, midnight UTC
        var cutoffOffset = new DateTimeOffset(cutoff, TimeSpan.Zero);

        var recentDates = await db.Tickets
            .Where(t => t.CreatedAt >= cutoffOffset)
            .Select(t => t.CreatedAt)
            .ToListAsync();

        var countByDate = recentDates
            .GroupBy(dt => dt.UtcDateTime.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        var ticketsPerDay = Enumerable.Range(0, 30)
            .Select(i => cutoff.AddDays(i))
            .Select(date => new DayCountDto(
                date.ToString("yyyy-MM-dd"),
                countByDate.GetValueOrDefault(date, 0)))
            .ToList();

        return Ok(new DashboardDto(total, open, resolvedByAi, aiPercent, avgMinutes, ticketsPerDay));
    }
}

public record DashboardDto(
    int              TotalTickets,
    int              OpenTickets,
    int              ResolvedByAi,
    double           AiResolutionPercent,
    double?          AvgResolutionMinutes,
    List<DayCountDto> TicketsPerDay
);

public record DayCountDto(string Date, int Count);
