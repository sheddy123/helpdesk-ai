using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HelpdeskAi.Migrations
{
    /// <inheritdoc />
    public partial class ReplySenderType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsInbound",
                table: "TicketReplies");

            migrationBuilder.AddColumn<int>(
                name: "SenderType",
                table: "TicketReplies",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SenderType",
                table: "TicketReplies");

            migrationBuilder.AddColumn<bool>(
                name: "IsInbound",
                table: "TicketReplies",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
