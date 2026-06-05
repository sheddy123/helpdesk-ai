using Microsoft.AspNetCore.Identity;

namespace HelpdeskAi.Models;

public class ApplicationUser : IdentityUser
{
    public bool IsActive { get; set; } = true;
    public ICollection<Ticket> AssignedTickets { get; set; } = [];
}
