namespace HelpdeskAi.Models;

public class Ticket
{
    public int Id { get; set; }
    public required string SenderEmail { get; set; }
    public required string Subject { get; set; }
    public required string Body { get; set; }
    public string? MessageId { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public TicketCategory? Category { get; set; }
    public string? AssignedToId { get; set; }
    public ApplicationUser? AssignedTo { get; set; }
    public string? AiSummary { get; set; }
    public string? AiSuggestedReply { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAt { get; set; }
}

public enum TicketStatus { Open, Resolved, Closed }

public enum TicketCategory { GeneralQuestion, TechnicalQuestion, RefundRequest }
