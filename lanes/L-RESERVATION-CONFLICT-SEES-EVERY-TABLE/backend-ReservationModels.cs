using System;
using System.Collections.Generic;
using WebApi.Enums;

namespace WebApi.Models.FloorPlan
{
    // Times are server-local Norwegian time. TableId/TableName describe the primary table (a combined
    // display name for a multi-table seating); Tables lists every assigned table.
    public class ReservationModel
    {
        public int ReservationId { get; set; }
        public int? TableId { get; set; }
        public string TableName { get; set; }
        public List<ReservationTableRefModel> Tables { get; set; } = new List<ReservationTableRefModel>();
        public int PartySize { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public ReservationStatus Status { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string Comment { get; set; }
        public bool IsWalkIn { get; set; }
        public bool CreatedByAdmin { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // One table assigned to a reservation. TableId is null when the table was later removed;
    // TableName is the display snapshot from booking time.
    public class ReservationTableRefModel
    {
        public int? TableId { get; set; }
        public string TableName { get; set; }
    }

    // DurationMinutes of 0 means "use the store's default seating length". TableIds (multi-table
    // seating) wins over TableId; both empty means auto-assign, which may combine tables.
    public class AdminReservationModel
    {
        public int? TableId { get; set; }
        public List<int> TableIds { get; set; } = new List<int>();
        public DateTime StartTime { get; set; }
        public int DurationMinutes { get; set; }
        public int PartySize { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string Comment { get; set; }
        public ReservationStatus Status { get; set; }
        public bool IsWalkIn { get; set; }

        // When an explicit table is chosen and its capacity does not fit the party, the save
        // is rejected unless this is set (admin override).
        public bool OverrideCapacity { get; set; }
    }

    // Guest booking request. Date is "yyyy-MM-dd", Time is "HH:mm", both server-local.
    public class ConsumerReservationRequestModel
    {
        public string Date { get; set; }
        public string Time { get; set; }
        public int Guests { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Comment { get; set; }
    }

    // CancelToken is only present when self-service cancellation is enabled.
    public class ReservationConfirmationModel
    {
        public int ReservationId { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public string EndTime { get; set; }
        public int PartySize { get; set; }
        public string StoreName { get; set; }
        public bool AllowGuestCancellation { get; set; }
        public Guid? CancelToken { get; set; }
    }

    // Looked up by cancel token from the SMS cancellation page.
    public class ReservationPublicModel
    {
        public string StoreName { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public int PartySize { get; set; }
        public ReservationStatus Status { get; set; }
        public bool CanCancel { get; set; }
    }

    // A cheap day list (MaxDaysAhead days, each with an Open flag) plus the slots for one date.
    public class ReservationAvailabilityModel
    {
        public bool Enabled { get; set; }
        public int MaxGuests { get; set; }
        public int SeatingMinutes { get; set; }
        public List<ReservationAvailabilityDayModel> Days { get; set; } = new List<ReservationAvailabilityDayModel>();

        // The date the Slots list applies to ("yyyy-MM-dd").
        public string Date { get; set; }

        // Bookable start times for Date, as "HH:mm".
        public List<string> Slots { get; set; } = new List<string>();
    }

    public class ReservationAvailabilityDayModel
    {
        // "yyyy-MM-dd".
        public string Date { get; set; }

        // True only when the day has at least one bookable slot for the requested party size
        // (window open AND capacity left), so the calendar never offers a day that turns out
        // to be full when clicked.
        public bool Open { get; set; }
    }

    public class ReservationSuggestionRequestModel
    {
        public DateTime StartTime { get; set; }
        public int DurationMinutes { get; set; }
        public int PartySize { get; set; }
        public int? ExcludeReservationId { get; set; }
    }

    // TableId is the primary suggestion; TableIds carries the full set when the engine had
    // to combine tables for the party.
    public class ReservationSuggestionModel
    {
        public int? TableId { get; set; }
        public List<int> TableIds { get; set; } = new List<int>();
    }
}
