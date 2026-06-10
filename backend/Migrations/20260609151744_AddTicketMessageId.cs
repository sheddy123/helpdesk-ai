using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HelpdeskAi.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketMessageId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MessageId",
                table: "Tickets",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_MessageId",
                table: "Tickets",
                column: "MessageId",
                unique: true,
                filter: "[MessageId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tickets_MessageId",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "MessageId",
                table: "Tickets");
        }
    }
}
