using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebApi.Helpers;
using WebApi.Models.FloorPlan;
using WebApi.Services;
using WebApi.Services.Interfaces;

namespace WebApi.Controllers
{
    // Table reservations (L3b). Admin routes are store-scoped with the same StoreAdmin
    // resource check as TableController; the consumer routes (availability / book / lookup /
    // cancel) are anonymous and rate-limited. Literal segments plus :int/:guid constraints
    // keep the anonymous routes from colliding with the store-id admin routes.
    [Authorize]
    [ApiController]
    [Route("[controller]")]
    public class ReservationController : StoreScopedControllerBase
    {
        private readonly IReservationService _reservationService;
        private readonly IReservationRateLimiter _rateLimiter;
        private readonly IClientConfigurationService _clientConfig;
        private readonly ILogger<ReservationController> _logger;

        public ReservationController(
            IReservationService reservationService,
            IReservationRateLimiter rateLimiter,
            IClientConfigurationService clientConfig,
            IStoreAdminAccess storeAdminAccess,
            ILogger<ReservationController> logger)
            : base(storeAdminAccess)
        {
            _reservationService = reservationService;
            _rateLimiter = rateLimiter;
            _clientConfig = clientConfig;
            _logger = logger;
        }

        // ---- Admin ------------------------------------------------------------------

        [HttpGet("{storeId:int}")]
        public async Task<IActionResult> GetForDay(int storeId, [FromQuery] string date)
        {
            try
            {
                if (!await IsStoreAdminAsync(storeId))
                {
                    return AccessDenied();
                }

                return Ok(await _reservationService.GetForDayAsync(storeId, date));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{storeId:int}/search")]
        public async Task<IActionResult> Search(int storeId, [FromQuery] string q)
        {
            try
            {
                if (!await IsStoreAdminAsync(storeId))
                {
                    return AccessDenied();
                }

                return Ok(await _reservationService.SearchAsync(storeId, q));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{storeId:int}")]
        public async Task<IActionResult> CreateAdmin(int storeId, [FromBody] AdminReservationModel model)
        {
            try
            {
                if (!await IsStoreAdminAsync(storeId))
                {
                    return AccessDenied();
                }

                return Ok(await _reservationService.CreateAdminReservationAsync(storeId, model, User?.Identity?.Name));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{storeId:int}/{reservationId:int}")]
        public async Task<IActionResult> UpdateAdmin(int storeId, int reservationId, [FromBody] AdminReservationModel model)
        {
            try
            {
                if (!await IsStoreAdminAsync(storeId))
                {
                    return AccessDenied();
                }

                return Ok(await _reservationService.UpdateAdminReservationAsync(storeId, reservationId, model));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{storeId:int}/suggest")]
        public async Task<IActionResult> Suggest(int storeId, [FromBody] ReservationSuggestionRequestModel model)
        {
            try
            {
                if (!await IsStoreAdminAsync(storeId))
                {
                    return AccessDenied();
                }

                return Ok(await _reservationService.SuggestTableAsync(storeId, model));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        // ---- Consumer (anonymous) ---------------------------------------------------

        [AllowAnonymous]
        [EnableRateLimiting("availability")]
        [HttpGet("availability/{storeId:int}")]
        public async Task<IActionResult> GetAvailability(int storeId, [FromQuery] string date, [FromQuery] int guests = 2)
        {
            try
            {
                return Ok(await _reservationService.GetAvailabilityAsync(storeId, date, guests));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("book/{storeId:int}")]
        public async Task<IActionResult> Book(int storeId, [FromBody] ConsumerReservationRequestModel model)
        {
            if (!_rateLimiter.TryConsumeCreate(HttpContext, model?.Phone, out var retryAfter))
            {
                Response.Headers.RetryAfter = System.Math.Ceiling(retryAfter.TotalSeconds).ToString("0");
                return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "For mange forespørsler. Prøv igjen senere." });
            }

            try
            {
                var origin = ResolveValidatedOrigin();
                var confirmation = await _reservationService.CreateConsumerReservationAsync(storeId, model, origin, User?.Identity?.Name);
                return Ok(confirmation);
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpGet("by-token/{token:guid}")]
        public async Task<IActionResult> GetByToken(Guid token)
        {
            if (!_rateLimiter.TryConsumeLookup(HttpContext, out var retryAfter))
            {
                Response.Headers.RetryAfter = System.Math.Ceiling(retryAfter.TotalSeconds).ToString("0");
                return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "For mange forespørsler. Prøv igjen senere." });
            }

            try
            {
                return Ok(await _reservationService.GetByCancelTokenAsync(token));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("cancel/{token:guid}")]
        public async Task<IActionResult> Cancel(Guid token)
        {
            if (!_rateLimiter.TryConsumeLookup(HttpContext, out var retryAfter))
            {
                Response.Headers.RetryAfter = System.Math.Ceiling(retryAfter.TotalSeconds).ToString("0");
                return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "For mange forespørsler. Prøv igjen senere." });
            }

            try
            {
                return Ok(await _reservationService.CancelByTokenAsync(token));
            }
            catch (AppException ex)
            {
                _logger.LogWarning(ex, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        // Resolves the request origin (Origin header, else the Referer's authority) and returns
        // it only when it is a whitelisted client domain; otherwise null so the SMS is sent
        // without a cancellation link. Any failure resolving the theme is treated as invalid.
        private string ResolveValidatedOrigin()
        {
            try
            {
                var origin = Request.Headers["Origin"].ToString();
                if (string.IsNullOrEmpty(origin))
                {
                    var referer = Request.Headers["Referer"].ToString();
                    if (!string.IsNullOrEmpty(referer)
                        && Uri.TryCreate(referer, UriKind.Absolute, out var uri))
                    {
                        origin = uri.GetLeftPart(UriPartial.Authority);
                    }
                }

                if (!string.IsNullOrEmpty(origin) && _clientConfig.IsDomainWhiteListed(origin))
                {
                    return origin;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to resolve reservation cancellation origin");
            }

            return null;
        }

    }
}
