using HelpdeskAi.Data;
using HelpdeskAi.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace HelpdeskAi.Auth;

public class DatabaseTicketStore : ITicketStore
{
    private readonly IServiceProvider _serviceProvider;

    public DatabaseTicketStore(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        await using var scope = _serviceProvider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new UserSession
        {
            Id = Guid.NewGuid().ToString("N"),
            TicketValue = Serialize(ticket),
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = ticket.Properties.ExpiresUtc
        };

        db.UserSessions.Add(session);
        await db.SaveChangesAsync();
        return session.Id;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        await using var scope = _serviceProvider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = await db.UserSessions.FindAsync(key);
        if (session is null) return;

        session.TicketValue = Serialize(ticket);
        session.ExpiresAt = ticket.Properties.ExpiresUtc;
        session.RenewedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        await using var scope = _serviceProvider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = await db.UserSessions.FindAsync(key);
        if (session is null) return null;
        if (session.ExpiresAt.HasValue && session.ExpiresAt.Value < DateTimeOffset.UtcNow) return null;

        return Deserialize(session.TicketValue);
    }

    public async Task RemoveAsync(string key)
    {
        await using var scope = _serviceProvider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = await db.UserSessions.FindAsync(key);
        if (session is null) return;

        db.UserSessions.Remove(session);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
        {
            // Session was already removed by a concurrent request — desired state achieved.
        }
    }

    private static string Serialize(AuthenticationTicket ticket)
        => Convert.ToBase64String(TicketSerializer.Default.Serialize(ticket));

    private static AuthenticationTicket? Deserialize(string value)
        => TicketSerializer.Default.Deserialize(Convert.FromBase64String(value));
}
