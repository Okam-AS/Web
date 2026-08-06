using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Enums;
using WebApi.Helpers;
using WebApi.Models.FloorPlan;
using WebApi.Services.Interfaces;

namespace WebApi.Services
{
    // A table is blocked by: an active reservation touching it (Seated always; Requested/
    // Confirmed until NoShowGraceMinutes past its start, after which a never-seated booking
    // releases its tables), and by an unsettled open check seated on it (assumed occupied
    // until its creation time plus the seating length, never earlier than now).
    public class ReservationService : IReservationService
    {
        internal const int MaxTablesPerSeating = 3;

        // How early before its start time a reservation still matches a check opened on its table.
        internal const int SeatArrivalWindowMinutes = 30;

        private readonly ApplicationDbContext _context;
        private readonly ISmsService _smsService;

        public ReservationService(ApplicationDbContext context, ISmsService smsService)
        {
            _context = context;
            _smsService = smsService;
        }

        // Test seam: overriding this freezes the clock for slot/lead/cancellation logic.
        protected virtual DateTime Now => DateTime.Now;

        public async Task<ReservationAvailabilityModel> GetAvailabilityAsync(int storeId, string date, int guests)
        {
            var (store, settings) = await LoadContextAsync(storeId);

            if (!IsReservationOpen(store, settings))
            {
                return new ReservationAvailabilityModel { Enabled = false };
            }

            var partySize = Math.Clamp(guests <= 0 ? 1 : guests, 1, Math.Max(1, settings.MaxGuests));

            // One load covers the whole range: the day list needs a real capacity answer per day
            // (not just "window exists"), so a full day can be greyed out instead of turning out
            // empty when clicked.
            var today = Now.Date;
            var candidates = await LoadCandidateTablesAsync(storeId);
            var blocks = await LoadBlocksAsync(
                storeId, today, today.AddDays(settings.MaxDaysAhead).AddHours(6), settings, null);

            var days = new List<ReservationAvailabilityDayModel>();
            for (var i = 0; i < settings.MaxDaysAhead; i++)
            {
                var day = today.AddDays(i);
                days.Add(new ReservationAvailabilityDayModel
                {
                    Date = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Open = HasAnyBookableSlot(store, settings, day, candidates, blocks, partySize)
                });
            }

            var targetDate = today;
            if (TryParseDate(date, out var requested)
                && requested >= today
                && requested <= today.AddDays(settings.MaxDaysAhead - 1))
            {
                targetDate = requested;
            }
            else
            {
                var firstOpen = days.FirstOrDefault(d => d.Open);
                if (firstOpen != null)
                {
                    targetDate = DateTime.ParseExact(firstOpen.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture);
                }
            }

            var slots = BuildBookableSlots(store, settings, targetDate, candidates, blocks, partySize);

            return new ReservationAvailabilityModel
            {
                Enabled = true,
                MaxGuests = settings.MaxGuests,
                SeatingMinutes = settings.SeatingMinutes,
                Days = days,
                Date = targetDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Slots = slots.Select(s => s.ToString("HH:mm", CultureInfo.InvariantCulture)).ToList()
            };
        }

        public async Task<ReservationConfirmationModel> CreateConsumerReservationAsync(
            int storeId, ConsumerReservationRequestModel model, string origin, string userId)
        {
            if (model == null)
            {
                throw new AppException(ErrorMessages.ReservationInvalidTime);
            }

            var (store, settings) = await LoadContextAsync(storeId);

            if (!IsReservationOpen(store, settings))
            {
                throw new AppException(ErrorMessages.ReservationsDisabled);
            }

            if (model.Guests < 1 || model.Guests > settings.MaxGuests)
            {
                throw new AppException(ErrorMessages.ReservationTooManyGuests);
            }

            var name = (model.Name ?? string.Empty).Trim();
            if (name.Length < 2)
            {
                throw new AppException("A name is required for the booking");
            }

            if (CountDigits(model.Phone) < 8)
            {
                throw new AppException("A valid phone number is required for the booking");
            }

            if (!TryParseDate(model.Date, out var date))
            {
                throw new AppException(ErrorMessages.ReservationInvalidTime);
            }

            if (date > Now.Date.AddDays(settings.MaxDaysAhead - 1))
            {
                throw new AppException(ErrorMessages.ReservationTooFarAhead);
            }

            // Table availability is deliberately not checked here: the transaction below is the
            // authority on free tables, so a table taken concurrently surfaces as
            // ReservationNoTableAvailable rather than as an invalid time.
            var grid = BuildTimeGrid(store, settings, date);
            if (!TryParseTime(model.Time, out var timeOfDay)
                || !grid.Any(s => s.TimeOfDay == timeOfDay))
            {
                throw new AppException(ErrorMessages.ReservationInvalidTime);
            }

            var start = date.Date + timeOfDay;
            var end = start.AddMinutes(settings.SeatingMinutes);
            var phone = NormalizePhone(model.Phone);
            var cancelToken = Guid.NewGuid();

            var reservation = await RunSerializableAsync(async () =>
            {
                var tables = await FindFreeTablesAsync(storeId, settings, start, end, model.Guests, null);
                if (tables == null)
                {
                    throw new AppException(ErrorMessages.ReservationNoTableAvailable);
                }

                var row = new Reservation
                {
                    StoreId = storeId,
                    PartySize = model.Guests,
                    StartTime = start,
                    EndTime = end,
                    Status = ReservationStatus.Confirmed,
                    CustomerName = name,
                    CustomerPhone = phone,
                    Comment = model.Comment,
                    IsWalkIn = false,
                    CreatedByAdmin = false,
                    CreatedByUserId = userId,
                    CreatedAt = Now,
                    CancelToken = cancelToken
                };
                ApplyTables(row, tables);
                _context.Reservations.Add(row);
                await _context.SaveChangesAsync();
                return row;
            });

            // The message is built inside the request so the fire-and-forget task touches no
            // request state.
            var includeLink = settings.AllowGuestCancellation && !string.IsNullOrEmpty(origin);
            var cancelUrl = includeLink
                ? origin.TrimEnd('/') + "/reservation/cancel?token=" + cancelToken
                : null;
            var message = BuildConfirmationSms(store.Name, start, model.Guests, cancelUrl);
            FireAndForgetTask.Run(() => _smsService.SendSmsAsync(phone, message, store.SmsSenderName));

            return new ReservationConfirmationModel
            {
                ReservationId = reservation.ReservationId,
                Date = start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Time = start.ToString("HH:mm", CultureInfo.InvariantCulture),
                EndTime = end.ToString("HH:mm", CultureInfo.InvariantCulture),
                PartySize = model.Guests,
                StoreName = store.Name,
                AllowGuestCancellation = settings.AllowGuestCancellation,
                CancelToken = settings.AllowGuestCancellation ? cancelToken : (Guid?)null
            };
        }

        public async Task<ReservationPublicModel> GetByCancelTokenAsync(Guid token)
        {
            var reservation = await _context.Reservations
                .AsNoTracking()
                .Include(r => r.Store)
                .FirstOrDefaultAsync(r => r.CancelToken == token);
            if (reservation == null)
            {
                throw new AppException(ErrorMessages.ReservationNotFound);
            }

            var settings = await ResolveSettingsAsync(reservation.StoreId);
            return ToPublicModel(reservation, CanCancel(reservation, settings));
        }

        public async Task<ReservationPublicModel> CancelByTokenAsync(Guid token)
        {
            var reservation = await _context.Reservations
                .Include(r => r.Store)
                .FirstOrDefaultAsync(r => r.CancelToken == token);
            if (reservation == null)
            {
                throw new AppException(ErrorMessages.ReservationNotFound);
            }

            // Already cancelled: idempotent, independent of the current toggle.
            if (reservation.Status == ReservationStatus.Cancelled)
            {
                return ToPublicModel(reservation, false);
            }

            var settings = await ResolveSettingsAsync(reservation.StoreId);
            if (!settings.AllowGuestCancellation)
            {
                throw new AppException(ErrorMessages.ReservationCancellationDisabled);
            }

            if (reservation.Status != ReservationStatus.Requested
                && reservation.Status != ReservationStatus.Confirmed)
            {
                throw new AppException(ErrorMessages.ReservationCancellationTooLate);
            }

            if (reservation.StartTime <= Now)
            {
                throw new AppException(ErrorMessages.ReservationCancellationTooLate);
            }

            reservation.Status = ReservationStatus.Cancelled;
            await _context.SaveChangesAsync();

            return ToPublicModel(reservation, false);
        }

        public async Task<List<ReservationModel>> GetForDayAsync(int storeId, string date)
        {
            if (!TryParseDate(date, out var day))
            {
                day = Now.Date;
            }

            var dayStart = day.Date;
            var dayEnd = dayStart.AddDays(1);

            var reservations = await _context.Reservations
                .AsNoTracking()
                .Include(r => r.Tables)
                .Where(r => r.StoreId == storeId && r.StartTime >= dayStart && r.StartTime < dayEnd)
                .OrderBy(r => r.StartTime)
                .ToListAsync();

            return reservations.Select(ToModel).ToList();
        }

        public async Task<List<ReservationModel>> SearchAsync(int storeId, string q)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return new List<ReservationModel>();
            }

            var term = q.Trim();
            var reservations = await _context.Reservations
                .AsNoTracking()
                .Include(r => r.Tables)
                .Where(r => r.StoreId == storeId
                    && (r.CustomerName.Contains(term) || r.CustomerPhone.Contains(term)))
                .OrderByDescending(r => r.StartTime)
                .Take(50)
                .ToListAsync();

            return reservations.Select(ToModel).ToList();
        }

        public async Task<ReservationModel> CreateAdminReservationAsync(int storeId, AdminReservationModel model, string userId)
        {
            if (model == null)
            {
                throw new AppException(ErrorMessages.ReservationInvalidTime);
            }

            // Even on the trusted admin path, a non-positive party or a start time well in the past
            // is a client bug that would block a table until EndTime. A deliberately back-dated
            // walk-in entry is still allowed.
            if (model.PartySize < 1)
            {
                throw new AppException(ErrorMessages.ReservationTooManyGuests);
            }
            if (!model.IsWalkIn && model.StartTime < Now.AddHours(-24))
            {
                throw new AppException(ErrorMessages.ReservationInvalidTime);
            }

            var settings = await ResolveSettingsAsync(storeId);
            var duration = model.DurationMinutes > 0 ? model.DurationMinutes : settings.SeatingMinutes;
            var start = model.StartTime;
            var end = start.AddMinutes(duration);

            var reservation = await RunSerializableAsync(async () =>
            {
                var tables = await ResolveAdminTablesAsync(storeId, settings, model, start, end, null);

                var row = new Reservation
                {
                    StoreId = storeId,
                    PartySize = model.PartySize,
                    StartTime = start,
                    EndTime = end,
                    Status = model.Status,
                    CustomerName = model.CustomerName,
                    CustomerPhone = model.CustomerPhone,
                    Comment = model.Comment,
                    IsWalkIn = model.IsWalkIn,
                    CreatedByAdmin = true,
                    CreatedByUserId = userId,
                    CreatedAt = Now,
                    CancelToken = Guid.NewGuid()
                };
                ApplyTables(row, tables);
                _context.Reservations.Add(row);
                await _context.SaveChangesAsync();
                return row;
            });

            return ToModel(reservation);
        }

        public async Task<ReservationModel> UpdateAdminReservationAsync(int storeId, int reservationId, AdminReservationModel model)
        {
            if (model == null)
            {
                throw new AppException(ErrorMessages.ReservationInvalidTime);
            }

            var settings = await ResolveSettingsAsync(storeId);

            var reservation = await RunSerializableAsync(async () =>
            {
                var row = await _context.Reservations
                    .Include(r => r.Tables)
                    .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.StoreId == storeId);
                if (row == null)
                {
                    throw new AppException(ErrorMessages.ReservationNotFound);
                }

                // On update a zero duration means "keep the booked length", not "recompute from the
                // current default": an edit to an unrelated field must never resize an existing
                // booking and thereby free or block table time.
                var existingDuration = (int)(row.EndTime - row.StartTime).TotalMinutes;
                var duration = model.DurationMinutes > 0
                    ? model.DurationMinutes
                    : (existingDuration > 0 ? existingDuration : settings.SeatingMinutes);
                var start = model.StartTime;
                var end = start.AddMinutes(duration);

                // A status-only transition (no-show, cancel) must stay possible even after the freed
                // slot has been rebooked, so conflict validation runs only when the seating changes.
                if (IsSeatingUnchanged(row, model, start, end))
                {
                    row.PartySize = model.PartySize;
                    row.Status = model.Status;
                    row.CustomerName = model.CustomerName;
                    row.CustomerPhone = model.CustomerPhone;
                    row.Comment = model.Comment;
                    row.IsWalkIn = model.IsWalkIn;

                    await _context.SaveChangesAsync();
                    return row;
                }

                var tables = await ResolveAdminTablesAsync(storeId, settings, model, start, end, reservationId);

                _context.ReservationTables.RemoveRange(row.Tables);
                row.Tables.Clear();
                ApplyTables(row, tables);

                row.PartySize = model.PartySize;
                row.StartTime = start;
                row.EndTime = end;
                row.Status = model.Status;
                row.CustomerName = model.CustomerName;
                row.CustomerPhone = model.CustomerPhone;
                row.Comment = model.Comment;
                row.IsWalkIn = model.IsWalkIn;

                await _context.SaveChangesAsync();
                return row;
            });

            return ToModel(reservation);
        }

        public async Task<ReservationSuggestionModel> SuggestTableAsync(int storeId, ReservationSuggestionRequestModel model)
        {
            if (model == null)
            {
                return new ReservationSuggestionModel { TableId = null };
            }

            var settings = await ResolveSettingsAsync(storeId);
            var duration = model.DurationMinutes > 0 ? model.DurationMinutes : settings.SeatingMinutes;
            var end = model.StartTime.AddMinutes(duration);

            var tables = await FindFreeTablesAsync(storeId, settings, model.StartTime, end, model.PartySize, model.ExcludeReservationId);
            return new ReservationSuggestionModel
            {
                TableId = tables?.FirstOrDefault()?.TableId,
                TableIds = tables != null ? tables.Select(t => t.TableId).ToList() : new List<int>()
            };
        }

        // Links a check being seated on a table to the reservation expecting that table. Mutates
        // tracked entities only; the caller saves. Static so the kassa services need no
        // ReservationService dependency.
        internal static async Task<Reservation> LinkOrderToReservationAsync(
            ApplicationDbContext context, Order order, int tableId, DateTime now)
        {
            if (order.ReservationId.HasValue)
            {
                return null;
            }

            var arrivalCutoff = now.AddMinutes(SeatArrivalWindowMinutes);
            var candidates = await context.Reservations
                .Include(r => r.Tables)
                .Where(r => r.StoreId == order.StoreId
                    && (r.Status == ReservationStatus.Requested
                        || r.Status == ReservationStatus.Confirmed
                        || r.Status == ReservationStatus.Seated)
                    && r.EndTime > now
                    && r.StartTime <= arrivalCutoff
                    && (r.TableId == tableId || r.Tables.Any(rt => rt.TableId == tableId)))
                .OrderBy(r => r.StartTime)
                .ToListAsync();

            // A no-show past its grace has already been released by the availability engine and may
            // have been rebooked, so a walk-in must not re-seat it. The grace must resolve exactly as
            // in the engine (same fallback when no settings row exists) or a released no-show is
            // resurrected here.
            var graceMinutes = await context.Set<ReservationSettings>()
                .AsNoTracking()
                .Where(s => s.StoreId == order.StoreId)
                .Select(s => (int?)s.NoShowGraceMinutes)
                .FirstOrDefaultAsync() ?? TableService.DefaultReservationSettings().NoShowGraceMinutes;

            var match = candidates.FirstOrDefault(r =>
                !(graceMinutes > 0 && r.Status != ReservationStatus.Seated && now > r.StartTime.AddMinutes(graceMinutes)));
            if (match == null)
            {
                return null;
            }

            match.Status = ReservationStatus.Seated;
            order.ReservationId = match.ReservationId;
            return match;
        }

        // Frees the tables when the party pays instead of blocking until EndTime. With a split bill
        // (several part-orders sharing the link) the reservation completes only when the last
        // unsettled part settles. Mutates tracked entities only; the caller saves.
        internal static async Task CompleteLinkedReservationAsync(ApplicationDbContext context, Order order)
        {
            if (!order.ReservationId.HasValue)
            {
                return;
            }

            var reservationId = order.ReservationId.Value;
            var hasOtherOpenPart = await context.Orders
                .IgnoreQueryFilters()
                .AnyAsync(o => o.ReservationId == reservationId
                    && o.OrderId != order.OrderId
                    && o.Status == OrderStatus.OpenCheck
                    && o.JournalEntryId == null);
            if (hasOtherOpenPart)
            {
                return;
            }

            var reservation = await context.Reservations
                .FirstOrDefaultAsync(r => r.ReservationId == reservationId);
            if (reservation == null)
            {
                return;
            }

            if (reservation.Status == ReservationStatus.Requested
                || reservation.Status == ReservationStatus.Confirmed
                || reservation.Status == ReservationStatus.Seated)
            {
                reservation.Status = ReservationStatus.Completed;
            }
        }

        // Called when the seating check is voided, discarded, or its link is orphaned by a merge —
        // none of which settle, so CompleteLinkedReservation never runs and the reservation would
        // otherwise stay Seated and dead-block the table until EndTime. Only reverts a reservation
        // still Seated by THIS order. Mutates tracked entities only; the caller saves.
        internal static async Task ReleaseSeatedReservationAsync(ApplicationDbContext context, Order order)
        {
            if (!order.ReservationId.HasValue)
            {
                return;
            }

            var reservationId = order.ReservationId.Value;
            order.ReservationId = null;

            var hasOtherOpenPart = await context.Orders
                .IgnoreQueryFilters()
                .AnyAsync(o => o.ReservationId == reservationId
                    && o.OrderId != order.OrderId
                    && o.Status == OrderStatus.OpenCheck
                    && o.JournalEntryId == null);
            if (hasOtherOpenPart)
            {
                return;
            }

            var reservation = await context.Reservations
                .FirstOrDefaultAsync(r => r.ReservationId == reservationId);
            if (reservation == null)
            {
                return;
            }

            // Confirmed (not NoShow) keeps guest cancellation and the no-show grace working; an admin
            // resolves it to NoShow if the party never returns.
            if (reservation.Status == ReservationStatus.Seated)
            {
                reservation.Status = ReservationStatus.Confirmed;
            }
        }

        // True when an admin update cannot introduce a new table conflict, so conflict validation
        // may be skipped — otherwise, once the freed slot is rebooked, a dead reservation could
        // never be marked NoShow or Cancelled.
        private static bool IsSeatingUnchanged(Reservation row, AdminReservationModel model, DateTime start, DateTime end)
        {
            if (row.StartTime != start || row.EndTime != end)
            {
                return false;
            }

            var requested = (model.TableIds != null && model.TableIds.Count > 0)
                ? model.TableIds.Distinct().ToList()
                : (model.TableId.HasValue ? new List<int> { model.TableId.Value } : new List<int>());
            if (requested.Count == 0)
            {
                return false;
            }

            var current = new HashSet<int>();
            foreach (var rt in row.Tables)
            {
                if (rt.TableId.HasValue)
                {
                    current.Add(rt.TableId.Value);
                }
            }
            if (current.Count == 0 && row.TableId.HasValue)
            {
                current.Add(row.TableId.Value);
            }

            // Set EQUALITY, not subset: a downsize (e.g. {1} of a combined {1,2}) genuinely removes a
            // table and must fall through to the table-removal path, or the dropped table stays
            // blocked all evening.
            return requested.Count == current.Count && requested.All(id => current.Contains(id));
        }

        // An explicit admin table choice deliberately ignores open-check blocking (the admin is
        // looking at the room) and may use tables in deactivated zones.
        private async Task<List<Table>> ResolveAdminTablesAsync(
            int storeId, ReservationSettingsModel settings, AdminReservationModel model,
            DateTime start, DateTime end, int? excludeReservationId)
        {
            var explicitIds = (model.TableIds != null && model.TableIds.Count > 0)
                ? model.TableIds.Distinct().ToList()
                : (model.TableId.HasValue ? new List<int> { model.TableId.Value } : new List<int>());

            if (explicitIds.Count == 0)
            {
                var allocated = await FindFreeTablesAsync(storeId, settings, start, end, model.PartySize, excludeReservationId);
                if (allocated == null)
                {
                    throw new AppException(ErrorMessages.ReservationNoTableAvailable);
                }
                return allocated;
            }

            var chosen = await _context.Set<Table>()
                .Where(t => explicitIds.Contains(t.TableId) && t.StoreId == storeId)
                .ToListAsync();
            if (chosen.Count != explicitIds.Count)
            {
                throw new AppException(ErrorMessages.TableNotFound);
            }

            if (!model.OverrideCapacity
                && (model.PartySize < chosen.Sum(t => t.MinCapacity) || model.PartySize > chosen.Sum(t => t.MaxCapacity)))
            {
                throw new AppException(ErrorMessages.ReservationCapacityMismatch);
            }

            var blocks = await LoadReservationBlocksAsync(storeId, start, end, settings, excludeReservationId);
            if (chosen.Any(t => IsBlocked(t.TableId, start, end, blocks)))
            {
                throw new AppException(ErrorMessages.ReservationConflict);
            }

            return chosen.OrderBy(t => t.TableNumber).ToList();
        }

        private async Task<List<Table>> FindFreeTablesAsync(
            int storeId, ReservationSettingsModel settings, DateTime start, DateTime end,
            int partySize, int? excludeReservationId)
        {
            var candidates = await LoadCandidateTablesAsync(storeId);
            if (candidates.Count == 0)
            {
                return null;
            }

            var blocks = await LoadBlocksAsync(storeId, start, end, settings, excludeReservationId);
            return AllocateTables(candidates, blocks, start, end, partySize);
        }

        // Only active tables in active zones are ever auto-allocated: switching a seasonal zone off
        // takes its tables out of the engine without deactivating each one.
        private async Task<List<Table>> LoadCandidateTablesAsync(int storeId)
        {
            return await _context.Set<Table>()
                .Where(t => t.StoreId == storeId && t.IsActive && t.Zone.IsActive)
                .ToListAsync();
        }

        // Blocked intervals per table id; see the class comment for the blocking rules.
        private async Task<Dictionary<int, List<(DateTime Start, DateTime End)>>> LoadBlocksAsync(
            int storeId, DateTime lower, DateTime upper, ReservationSettingsModel settings, int? excludeReservationId)
        {
            var blocks = await LoadReservationBlocksAsync(storeId, lower, upper, settings, excludeReservationId);

            // An unsettled open check occupies its table until (created + seating length), never
            // shorter than now. Settled checks (JournalEntryId stamped) do not block.
            var now = Now;
            var openChecks = await _context.Orders
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(o => o.StoreId == storeId
                    && o.Status == OrderStatus.OpenCheck
                    && o.JournalEntryId == null
                    && o.TableId != null)
                .Select(o => new { o.TableId, o.Created })
                .ToListAsync();

            foreach (var check in openChecks)
            {
                var seatedAt = check.Created ?? now;
                var expectedFreeAt = seatedAt.AddMinutes(settings.SeatingMinutes);
                if (expectedFreeAt < now)
                {
                    expectedFreeAt = now;
                }
                AddBlock(blocks, check.TableId.Value, DateTime.MinValue, expectedFreeAt);
            }

            return blocks;
        }

        private async Task<Dictionary<int, List<(DateTime Start, DateTime End)>>> LoadReservationBlocksAsync(
            int storeId, DateTime lower, DateTime upper, ReservationSettingsModel settings, int? excludeReservationId)
        {
            var reservations = await _context.Reservations
                .AsNoTracking()
                .Include(r => r.Tables)
                .Where(r => r.StoreId == storeId
                    && (excludeReservationId == null || r.ReservationId != excludeReservationId.Value)
                    && (r.Status == ReservationStatus.Requested
                        || r.Status == ReservationStatus.Confirmed
                        || r.Status == ReservationStatus.Seated)
                    && r.EndTime > lower && r.StartTime < upper)
                .ToListAsync();

            var blocks = new Dictionary<int, List<(DateTime Start, DateTime End)>>();
            var now = Now;
            foreach (var reservation in reservations)
            {
                if (IsReleasedNoShow(reservation, settings, now))
                {
                    continue;
                }

                foreach (var rt in reservation.Tables)
                {
                    if (rt.TableId.HasValue)
                    {
                        AddBlock(blocks, rt.TableId.Value, reservation.StartTime, reservation.EndTime);
                    }
                }

                // Rows written outside the engine may carry only the denormalized primary table; it
                // must still block.
                if (reservation.Tables.Count == 0 && reservation.TableId.HasValue)
                {
                    AddBlock(blocks, reservation.TableId.Value, reservation.StartTime, reservation.EndTime);
                }
            }

            return blocks;
        }

        // A never-seated booking stops blocking once its grace has run out; the status itself stays
        // untouched for the admin to resolve. Seated reservations block until EndTime.
        private static bool IsReleasedNoShow(Reservation reservation, ReservationSettingsModel settings, DateTime now)
        {
            return settings.NoShowGraceMinutes > 0
                && reservation.Status != ReservationStatus.Seated
                && now > reservation.StartTime.AddMinutes(settings.NoShowGraceMinutes);
        }

        private static void AddBlock(
            Dictionary<int, List<(DateTime Start, DateTime End)>> blocks, int tableId, DateTime start, DateTime end)
        {
            if (!blocks.TryGetValue(tableId, out var list))
            {
                list = new List<(DateTime Start, DateTime End)>();
                blocks[tableId] = list;
            }
            list.Add((start, end));
        }

        private static bool IsBlocked(
            int tableId, DateTime start, DateTime end, Dictionary<int, List<(DateTime Start, DateTime End)>> blocks)
        {
            return blocks.TryGetValue(tableId, out var list)
                && list.Any(b => b.Start < end && start < b.End);
        }

        // Combination tables are returned in table-number order, so the first is the primary.
        private static List<Table> AllocateTables(
            List<Table> candidates,
            Dictionary<int, List<(DateTime Start, DateTime End)>> blocks,
            DateTime start, DateTime end, int partySize)
        {
            var free = candidates
                .Where(t => !IsBlocked(t.TableId, start, end, blocks))
                .ToList();
            if (free.Count == 0)
            {
                return null;
            }

            var single = free
                .Where(t => t.MinCapacity <= partySize && partySize <= t.MaxCapacity)
                .OrderBy(t => t.MaxCapacity)
                .ThenBy(t => t.Seats)
                .ThenBy(t => t.TableNumber)
                .FirstOrDefault();
            if (single != null)
            {
                return new List<Table> { single };
            }

            for (var size = 2; size <= MaxTablesPerSeating; size++)
            {
                List<Table> best = null;
                var bestKey = (TotalMax: int.MaxValue, TotalSeats: int.MaxValue, FirstNumber: int.MaxValue);

                foreach (var zone in free.GroupBy(t => t.ZoneId))
                {
                    var zoneTables = zone.OrderBy(t => t.TableNumber).ToList();
                    foreach (var combo in Combinations(zoneTables, size))
                    {
                        var totalMin = combo.Sum(t => t.MinCapacity);
                        var totalMax = combo.Sum(t => t.MaxCapacity);
                        if (totalMin > partySize || partySize > totalMax)
                        {
                            continue;
                        }

                        var key = (TotalMax: totalMax, TotalSeats: combo.Sum(t => t.Seats), FirstNumber: combo[0].TableNumber);
                        if (key.CompareTo(bestKey) < 0)
                        {
                            best = combo;
                            bestKey = key;
                        }
                    }
                }

                if (best != null)
                {
                    return best;
                }
            }

            return null;
        }

        // Brute force is fine: n is a zone's table count and k is 2..3.
        private static IEnumerable<List<Table>> Combinations(List<Table> tables, int size)
        {
            var indices = new int[size];
            for (var i = 0; i < size; i++)
            {
                indices[i] = i;
            }

            while (indices[0] <= tables.Count - size)
            {
                yield return indices.Select(i => tables[i]).ToList();

                var position = size - 1;
                while (position >= 0 && indices[position] == tables.Count - size + position)
                {
                    position--;
                }
                if (position < 0)
                {
                    yield break;
                }
                indices[position]++;
                for (var i = position + 1; i < size; i++)
                {
                    indices[i] = indices[i - 1] + 1;
                }
            }
        }

        // The single writer for the reservation/table relation. The ReservationTable rows are the
        // authority for overlap checks; TableId/TableName are denormalized copies.
        private static void ApplyTables(Reservation reservation, List<Table> tables)
        {
            reservation.TableId = tables.Count > 0 ? tables[0].TableId : (int?)null;
            reservation.TableName = tables.Count > 0
                ? string.Join(" + ", tables.Select(TableDisplayName))
                : null;

            for (var i = 0; i < tables.Count; i++)
            {
                reservation.Tables.Add(new ReservationTable
                {
                    TableId = tables[i].TableId,
                    TableName = TableDisplayName(tables[i]),
                    SortOrder = i
                });
            }
        }

        // The bare grid, with no table-availability filter: what the consumer create check validates
        // against.
        private List<DateTime> BuildTimeGrid(Store store, ReservationSettingsModel settings, DateTime date)
        {
            var window = GetWindow(store, settings, date);
            if (window == null)
            {
                return new List<DateTime>();
            }

            var (open, close) = window.Value;
            return GenerateSlotStarts(open, close, settings);
        }

        private List<DateTime> BuildBookableSlots(
            Store store, ReservationSettingsModel settings, DateTime date,
            List<Table> candidates,
            Dictionary<int, List<(DateTime Start, DateTime End)>> blocks,
            int partySize)
        {
            var result = new List<DateTime>();
            foreach (var slot in BuildTimeGrid(store, settings, date))
            {
                var slotEnd = slot.AddMinutes(settings.SeatingMinutes);
                if (AllocateTables(candidates, blocks, slot, slotEnd, partySize) != null)
                {
                    result.Add(slot);
                }
            }

            return result;
        }

        private bool HasAnyBookableSlot(
            Store store, ReservationSettingsModel settings, DateTime date,
            List<Table> candidates,
            Dictionary<int, List<(DateTime Start, DateTime End)>> blocks,
            int partySize)
        {
            foreach (var slot in BuildTimeGrid(store, settings, date))
            {
                var slotEnd = slot.AddMinutes(settings.SeatingMinutes);
                if (AllocateTables(candidates, blocks, slot, slotEnd, partySize) != null)
                {
                    return true;
                }
            }

            return false;
        }

        private List<DateTime> GenerateSlotStarts(DateTime open, DateTime close, ReservationSettingsModel settings)
        {
            var result = new List<DateTime>();
            var slotMinutes = Math.Max(1, settings.SlotMinutes);
            var lastSlot = close.AddMinutes(-settings.BufferMinutes);
            var earliest = Now.AddMinutes(settings.LeadMinutes);

            var first = RoundUpToSlot(open, slotMinutes);
            for (var slot = first; slot <= lastSlot; slot = slot.AddMinutes(slotMinutes))
            {
                if (slot >= earliest)
                {
                    result.Add(slot);
                }
            }

            return result;
        }

        private static DateTime RoundUpToSlot(DateTime time, int slotMinutes)
        {
            var dayStart = time.Date;
            var minutes = (int)Math.Ceiling((time - dayStart).TotalMinutes);
            var rounded = ((minutes + slotMinutes - 1) / slotMinutes) * slotMinutes;
            return dayStart.AddMinutes(rounded);
        }

        // A date override wins over both hour sources. A closing time at or before opening
        // (over-midnight) is capped to the following midnight — a documented v1 limitation.
        private static (DateTime open, DateTime close)? GetWindow(Store store, ReservationSettingsModel settings, DateTime date)
        {
            string from;
            string to;

            var dateKey = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var dateOverride = settings.DateOverrides?.FirstOrDefault(o => o.Date == dateKey);
            if (dateOverride != null)
            {
                if (dateOverride.Closed)
                {
                    return null;
                }
                from = dateOverride.From;
                to = dateOverride.To;
            }
            else if (settings.UseStoreHours)
            {
                // A store special day (dated override) wins over the weekly OpeningHour.
                var special = store.SpecialOpeningHours?.FirstOrDefault(s => s.Date.Date == date.Date);
                if (special != null)
                {
                    if (!special.Open)
                    {
                        return null;
                    }
                    from = special.OpeningTime;
                    to = special.ClosingTime;
                }
                else
                {
                    // Store OpeningHour weekday: 0 = Monday .. 6 = Sunday.
                    var weekday = date.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)date.DayOfWeek - 1;
                    var hour = store.OpeningHours?.FirstOrDefault(h => h.DayOfWeek == weekday);
                    if (hour == null || !hour.Open)
                    {
                        return null;
                    }
                    from = hour.OpeningTime;
                    to = hour.ClosingTime;
                }
            }
            else
            {
                var weekday = date.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)date.DayOfWeek - 1;
                var day = settings.Days?.FirstOrDefault(d => d.DayOfWeek == weekday);
                if (day == null || !day.Open)
                {
                    return null;
                }
                from = day.From;
                to = day.To;
            }

            if (!TryParseTime(from, out var openTs) || !TryParseTime(to, out var closeTs))
            {
                return null;
            }

            var open = date.Date + openTs;
            var close = closeTs <= openTs
                ? date.Date.AddDays(1) // over-midnight closing capped to the next midnight.
                : date.Date + closeTs;

            return (open, close);
        }

        internal static string BuildConfirmationSms(string storeName, DateTime start, int partySize, string cancelUrl)
        {
            var baseMessage = $"Bordreservasjon bekreftet hos {storeName} {start.FullDateString()} kl {start.FullTimeString()}, {partySize} gjester.";
            return string.IsNullOrEmpty(cancelUrl)
                ? baseMessage + " Ring oss for endringer."
                : baseMessage + $" Avbestill: {cancelUrl}";
        }

        private async Task<(Store store, ReservationSettingsModel settings)> LoadContextAsync(int storeId)
        {
            var store = await _context.Stores
                .Include(s => s.OpeningHours)
                .Include(s => s.SpecialOpeningHours)
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
            if (store == null)
            {
                throw new AppException(ErrorMessages.StoreNotFound);
            }

            return (store, await ResolveSettingsAsync(storeId));
        }

        private async Task<ReservationSettingsModel> ResolveSettingsAsync(int storeId)
        {
            var entity = await _context.Set<ReservationSettings>()
                .AsNoTracking()
                .Include(s => s.Days)
                .Include(s => s.DateOverrides)
                .FirstOrDefaultAsync(s => s.StoreId == storeId);

            return entity == null
                ? TableService.DefaultReservationSettings()
                : TableService.ToSettingsModel(entity);
        }

        private static bool IsReservationOpen(Store store, ReservationSettingsModel settings)
        {
            return store.TableReservationEnabled && settings.Enabled;
        }

        private bool CanCancel(Reservation reservation, ReservationSettingsModel settings)
        {
            return settings.AllowGuestCancellation
                && (reservation.Status == ReservationStatus.Requested
                    || reservation.Status == ReservationStatus.Confirmed)
                && reservation.StartTime > Now;
        }

        private static ReservationModel ToModel(Reservation r)
        {
            return new ReservationModel
            {
                ReservationId = r.ReservationId,
                TableId = r.TableId,
                TableName = r.TableName,
                Tables = (r.Tables ?? new List<ReservationTable>())
                    .OrderBy(rt => rt.SortOrder)
                    .Select(rt => new ReservationTableRefModel
                    {
                        TableId = rt.TableId,
                        TableName = rt.TableName
                    })
                    .ToList(),
                PartySize = r.PartySize,
                StartTime = r.StartTime,
                EndTime = r.EndTime,
                Status = r.Status,
                CustomerName = r.CustomerName,
                CustomerPhone = r.CustomerPhone,
                Comment = r.Comment,
                IsWalkIn = r.IsWalkIn,
                CreatedByAdmin = r.CreatedByAdmin,
                CreatedAt = r.CreatedAt
            };
        }

        private static ReservationPublicModel ToPublicModel(Reservation r, bool canCancel)
        {
            return new ReservationPublicModel
            {
                StoreName = r.Store?.Name,
                Date = r.StartTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Time = r.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
                PartySize = r.PartySize,
                Status = r.Status,
                CanCancel = canCancel
            };
        }

        private static string TableDisplayName(Table table)
        {
            return string.IsNullOrWhiteSpace(table.Name) ? "Bord " + table.TableNumber : table.Name;
        }

        // Serializable so a concurrent booking of the same table cannot slip between the free-table
        // check and the insert. A SQL Server deadlock (1205) is retried once, then surfaced as a
        // conflict. (Serializable isolation cannot be truly exercised on SQLite in tests.)
        private async Task<T> RunSerializableAsync<T>(Func<Task<T>> action)
        {
            try
            {
                return await ExecuteInTransactionAsync(action);
            }
            catch (Exception ex) when (IsDeadlock(ex))
            {
                try
                {
                    return await ExecuteInTransactionAsync(action);
                }
                catch (Exception retry) when (IsDeadlock(retry))
                {
                    throw new AppException(ErrorMessages.ReservationConflict);
                }
            }
        }

        private async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action)
        {
            // The configured SqlServer strategy (EnableRetryOnFailure) rejects user-initiated
            // transactions unless they run inside the execution strategy.
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                // A retried attempt must not carry over entities the rolled-back attempt left tracked
                // as Added: SaveChanges would re-insert them and the guest gets a duplicate
                // reservation. Every booking body re-loads its working set inside the transaction.
                _context.ChangeTracker.Clear();
                using (var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable))
                {
                    var result = await action();
                    await transaction.CommitAsync();
                    return result;
                }
            });
        }

        private static bool IsDeadlock(Exception ex)
        {
            for (var current = ex; current != null; current = current.InnerException)
            {
                if (current is SqlException sql && sql.Number == 1205)
                {
                    return true;
                }
            }
            return false;
        }

        private static bool TryParseDate(string value, out DateTime date)
        {
            return DateTime.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
        }

        private static bool TryParseTime(string value, out TimeSpan time)
        {
            time = TimeSpan.Zero;
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }
            return TimeSpan.TryParseExact(value.Trim(), "hh\\:mm", CultureInfo.InvariantCulture, out time);
        }

        private static int CountDigits(string value)
        {
            return string.IsNullOrEmpty(value) ? 0 : value.Count(char.IsDigit);
        }

        // Normalizes to E.164.
        private static string NormalizePhone(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
            {
                return phone;
            }

            var normalized = phone.Replace(" ", string.Empty);
            if (!normalized.StartsWith("+"))
            {
                normalized = "+47" + normalized;
            }
            return normalized;
        }
    }
}
