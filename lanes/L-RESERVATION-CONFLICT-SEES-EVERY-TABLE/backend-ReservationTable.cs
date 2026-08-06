using System.ComponentModel.DataAnnotations;

namespace WebApi.Entities
{
    // One table assigned to a reservation. A reservation normally seats one table, but a
    // party larger than any single table is seated on a combination of tables in the same
    // zone; each combined table gets its own row. SortOrder 0 is the primary table (mirrored
    // onto Reservation.TableId for the timeline). TableName is a display snapshot so the row
    // survives the table being renamed or removed (TableId then goes null, same pattern as
    // Order.TableName).
    public class ReservationTable
    {
        [Key]
        public int ReservationTableId { get; set; }

        public int ReservationId { get; set; }
        public virtual Reservation Reservation { get; set; }

        // Nullable; a removed table clears this reference (SetNull) while the row keeps
        // its TableName snapshot.
        public int? TableId { get; set; }
        public virtual Table Table { get; set; }

        // Display snapshot of the table's name at booking time.
        public string TableName { get; set; }

        // 0 = primary table; combined tables follow in assignment order.
        public int SortOrder { get; set; }
    }
}
