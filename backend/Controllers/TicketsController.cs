using HelpdeskAi.Data;
using HelpdeskAi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpdeskAi.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController(AppDbContext db) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var t = await db.Tickets.Include(t => t.AssignedTo).FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        return Ok(new TicketDetailDto(
            t.Id,
            t.SenderEmail,
            t.Subject,
            t.Body,
            t.Status.ToString(),
            t.Category.HasValue ? t.Category.Value.ToString() : null,
            t.AssignedTo?.UserName,
            t.AiSummary,
            t.AiSuggestedReply,
            t.CreatedAt,
            t.ResolvedAt
        ));
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string  sortBy   = "createdAt",
        [FromQuery] string  sortDir  = "desc",
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20,
        [FromQuery] string? status   = null,
        [FromQuery] string? category = null,
        [FromQuery] string? search   = null)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Tickets.Include(t => t.AssignedTo).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Subject.Contains(search) || t.SenderEmail.Contains(search));

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<TicketStatus>(status, ignoreCase: true, out var statusFilter))
            query = query.Where(t => t.Status == statusFilter);

        if (!string.IsNullOrEmpty(category) && Enum.TryParse<TicketCategory>(category, ignoreCase: true, out var categoryFilter))
            query = query.Where(t => t.Category == categoryFilter);

        bool desc = sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<Ticket> sorted = sortBy.ToLowerInvariant() switch
        {
            "subject"     => desc ? query.OrderByDescending(t => t.Subject)     : query.OrderBy(t => t.Subject),
            "senderemail" => desc ? query.OrderByDescending(t => t.SenderEmail) : query.OrderBy(t => t.SenderEmail),
            "status"      => desc ? query.OrderByDescending(t => t.Status)      : query.OrderBy(t => t.Status),
            "category"    => desc ? query.OrderByDescending(t => t.Category)    : query.OrderBy(t => t.Category),
            _             => desc ? query.OrderByDescending(t => t.CreatedAt)   : query.OrderBy(t => t.CreatedAt),
        };

        var totalCount = await sorted.CountAsync();

        var items = await sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TicketDto(
                t.Id,
                t.SenderEmail,
                t.Subject,
                t.Status.ToString(),
                t.Category.HasValue ? t.Category.Value.ToString() : null,
                t.AssignedTo != null ? t.AssignedTo.UserName : null,
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(new TicketsPageDto(items, totalCount, page, pageSize));
    }
}

public record TicketDetailDto(
    int Id,
    string SenderEmail,
    string Subject,
    string Body,
    string Status,
    string? Category,
    string? AssignedTo,
    string? AiSummary,
    string? AiSuggestedReply,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ResolvedAt
);

public record TicketDto(
    int Id,
    string SenderEmail,
    string Subject,
    string Status,
    string? Category,
    string? AssignedTo,
    DateTimeOffset CreatedAt
);

public record TicketsPageDto(
    List<TicketDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
