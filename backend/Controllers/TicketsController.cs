using HelpdeskAi.Data;
using HelpdeskAi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpdeskAi.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController(AppDbContext db, UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var t = await db.Tickets.Include(t => t.AssignedTo).FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        if (User.IsInRole(nameof(UserRole.Agent)))
        {
            var callerId = userManager.GetUserId(User);
            if (t.AssignedToId != callerId) return Forbid();
        }

        return Ok(ToDetailDto(t));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var ticket = await db.Tickets.Include(t => t.AssignedTo).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();

        if (User.IsInRole(nameof(UserRole.Agent)))
        {
            var callerId = userManager.GetUserId(User);
            if (ticket.AssignedToId != callerId) return Forbid();
        }

        if (!Enum.TryParse<TicketStatus>(request.Status, ignoreCase: true, out var newStatus))
            return BadRequest(new { error = "Invalid status." });

        ticket.Status = newStatus;
        if (newStatus == TicketStatus.Resolved && ticket.ResolvedAt is null)
            ticket.ResolvedAt = DateTimeOffset.UtcNow;
        else if (newStatus == TicketStatus.Open)
            ticket.ResolvedAt = null;

        await db.SaveChangesAsync();
        return Ok(ToDetailDto(ticket));
    }

    [HttpPatch("{id:int}/category")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
    {
        var ticket = await db.Tickets.Include(t => t.AssignedTo).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();

        if (request.Category is null)
        {
            ticket.Category = null;
        }
        else if (!Enum.TryParse<TicketCategory>(request.Category, ignoreCase: true, out var newCategory))
        {
            return BadRequest(new { error = "Invalid category." });
        }
        else
        {
            ticket.Category = newCategory;
        }

        await db.SaveChangesAsync();
        return Ok(ToDetailDto(ticket));
    }

    [HttpPatch("{id:int}/assign")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<IActionResult> Assign(int id, [FromBody] AssignRequest request)
    {
        var ticket = await db.Tickets.Include(t => t.AssignedTo).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();

        if (request.AgentId is null)
        {
            ticket.AssignedToId = null;
            ticket.AssignedTo   = null;
        }
        else
        {
            var agent = await userManager.FindByIdAsync(request.AgentId);
            if (agent is null || !await userManager.IsInRoleAsync(agent, nameof(UserRole.Agent)))
                return BadRequest(new { error = "Invalid agent." });

            ticket.AssignedToId = agent.Id;
            ticket.AssignedTo   = agent;
        }

        await db.SaveChangesAsync();
        return Ok(ToDetailDto(ticket));
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

        // Agents may only see their own assigned tickets
        if (User.IsInRole(nameof(UserRole.Agent)))
        {
            var callerId = userManager.GetUserId(User);
            query = query.Where(t => t.AssignedToId == callerId);
        }

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

    private static TicketDetailDto ToDetailDto(Ticket t) => new(
        t.Id,
        t.SenderEmail,
        t.Subject,
        t.Body,
        t.Status.ToString(),
        t.Category.HasValue ? t.Category.Value.ToString() : null,
        t.AssignedToId,
        t.AssignedTo?.UserName,
        t.AiSummary,
        t.AiSuggestedReply,
        t.CreatedAt,
        t.ResolvedAt
    );
}

public record TicketDetailDto(
    int Id,
    string SenderEmail,
    string Subject,
    string Body,
    string Status,
    string? Category,
    string? AssignedToId,
    string? AssignedTo,
    string? AiSummary,
    string? AiSuggestedReply,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ResolvedAt
);

public record UpdateStatusRequest(string Status);
public record UpdateCategoryRequest(string? Category);
public record AssignRequest(string? AgentId);

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
