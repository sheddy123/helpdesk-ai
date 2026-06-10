namespace HelpdeskAi.Models;

public enum ReplySenderType { Agent, Customer }

public class TicketReply
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;
    public string? AuthorId { get; set; }
    public ApplicationUser? Author { get; set; }
    public required string Body { get; set; }
    public ReplySenderType SenderType { get; set; } = ReplySenderType.Agent;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
