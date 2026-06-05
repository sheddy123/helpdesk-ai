using System.ComponentModel.DataAnnotations;

namespace HelpdeskAi.Models;

public class UserSession
{
    [Key]
    [MaxLength(128)]
    public string Id { get; set; } = "";
    public string TicketValue { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? RenewedAt { get; set; }
}
