using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using ReaderApi.Functions.Dtos;
using ReaderApi.Functions.Security;

namespace ReaderApi.Functions;

public class FeedFetchFunctions
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<FeedFetchFunctions> _logger;

    public FeedFetchFunctions(IHttpClientFactory httpClientFactory, ILogger<FeedFetchFunctions> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [Function("FetchFeed")]
    public async Task<HttpResponseData> Fetch(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "feeds/fetch")] HttpRequestData req)
    {
        FetchRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<FetchRequest>(req.Body,
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        catch (JsonException)
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Request body must be JSON with a 'url' field.");
            return bad;
        }

        if (!UrlGuard.IsAllowed(request?.Url, out var reason))
        {
            _logger.LogWarning("Rejected feed fetch for {Url}: {Reason}", request?.Url, reason);
            var forbidden = req.CreateResponse(HttpStatusCode.BadRequest);
            await forbidden.WriteStringAsync(reason);
            return forbidden;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("feeds");
            var text = await client.GetStringAsync(request!.Url);

            var res = req.CreateResponse(HttpStatusCode.OK);
            res.Headers.Add("Content-Type", "application/xml; charset=utf-8");
            await res.WriteStringAsync(text);
            return res;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Feed fetch failed for {Url}", request!.Url);
            var res = req.CreateResponse(HttpStatusCode.BadGateway);
            await res.WriteStringAsync($"Could not fetch feed: {ex.Message}");
            return res;
        }
        catch (TaskCanceledException)
        {
            var res = req.CreateResponse(HttpStatusCode.GatewayTimeout);
            await res.WriteStringAsync("Feed source did not respond in time.");
            return res;
        }
    }
}
