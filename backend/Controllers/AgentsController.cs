using HelpdeskAi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HelpdeskAi.Controllers;

[ApiController]
[Route("api/agents")]
[Authorize]
public class AgentsController(UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var agents = await userManager.GetUsersInRoleAsync(nameof(UserRole.Agent));
        return Ok(agents
            .Where(u => u.IsActive)
            .OrderBy(u => u.UserName)
            .Select(u => new AgentOptionDto(u.Id, u.UserName!)));
    }
}

public record AgentOptionDto(string Id, string UserName);
