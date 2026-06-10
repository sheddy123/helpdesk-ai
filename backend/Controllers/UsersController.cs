using HelpdeskAi.Data;
using HelpdeskAi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpdeskAi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class UsersController(UserManager<ApplicationUser> _userManager, AppDbContext db) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var agents = await _userManager.GetUsersInRoleAsync(nameof(UserRole.Agent));
        return Ok(agents.OrderBy(u => u.UserName).Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAgentRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            Email = request.Email,
            EmailConfirmed = true,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, nameof(UserRole.Agent));
        return Created($"/api/users/{user.Id}", ToDto(user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateAgentRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null || !await _userManager.IsInRoleAsync(user, nameof(UserRole.Agent)))
            return NotFound();

        user.UserName = request.UserName;
        user.Email = request.Email;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        if (!string.IsNullOrEmpty(request.Password))
        {
            await _userManager.RemovePasswordAsync(user);
            var pwResult = await _userManager.AddPasswordAsync(user, request.Password);
            if (!pwResult.Succeeded)
                return BadRequest(new { errors = pwResult.Errors.Select(e => e.Description) });
        }

        return Ok(ToDto(user));
    }

    [HttpPatch("{id}/activate")]
    public async Task<IActionResult> Activate(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null || !await _userManager.IsInRoleAsync(user, nameof(UserRole.Agent)))
            return NotFound();

        user.IsActive = true;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null || !await _userManager.IsInRoleAsync(user, nameof(UserRole.Agent)))
            return NotFound();

        await db.Tickets
            .Where(t => t.AssignedToId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.AssignedToId, (string?)null));

        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    private static UserDto ToDto(ApplicationUser u) =>
        new(u.Id, u.Email!, u.UserName!, u.IsActive);
}

public record UserDto(string Id, string Email, string UserName, bool IsActive);
public record CreateAgentRequest(string Email, string UserName, string Password);
public record UpdateAgentRequest(string UserName, string Email, string? Password);
