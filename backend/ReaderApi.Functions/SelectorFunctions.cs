using System.Net;
using System.Text.Json;
using AngleSharp;
using AngleSharp.Dom;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using ReaderApi.Functions.Dtos;
using ReaderApi.Functions.Security;

namespace ReaderApi.Functions;

public class SelectorFunctions
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SelectorFunctions> _logger;

    public SelectorFunctions(IHttpClientFactory httpClientFactory, ILogger<SelectorFunctions> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [Function("EvaluateSelector")]
    public async Task<HttpResponseData> Evaluate(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "selectors/evaluate")] HttpRequestData req)
    {
        SelectorEvalRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<SelectorEvalRequest>(req.Body,
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        catch (JsonException)
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Request body must be JSON with 'url' and 'config' fields.");
            return bad;
        }

        if (!UrlGuard.IsAllowed(request?.Url, out var reason))
        {
            _logger.LogWarning("Rejected selector evaluation for {Url}: {Reason}", request?.Url, reason);
            var forbidden = req.CreateResponse(HttpStatusCode.BadRequest);
            await forbidden.WriteStringAsync(reason);
            return forbidden;
        }

        string html;
        try
        {
            var client = _httpClientFactory.CreateClient("feeds");
            html = await client.GetStringAsync(request!.Url);
        }
        catch (HttpRequestException ex)
        {
            var res = req.CreateResponse(HttpStatusCode.BadGateway);
            await res.WriteStringAsync($"Could not fetch page: {ex.Message}");
            return res;
        }

        var response = await ExtractAsync(html, request!.Config);

        var okRes = req.CreateResponse(HttpStatusCode.OK);
        await okRes.WriteAsJsonAsync(response);
        return okRes;
    }

    private static async Task<SelectorEvalResponse> ExtractAsync(string html, SelectorConfig config)
    {
        var context = BrowsingContext.New(Configuration.Default);
        var document = await context.OpenAsync(req => req.Content(html));

        var warnings = new List<string>();
        var itemSelector = JoinSelectors(config.ItemSelectors);

        if (string.IsNullOrWhiteSpace(itemSelector))
        {
            warnings.Add("No item selectors configured.");
            return new SelectorEvalResponse { MatchedCount = 0, Warnings = warnings };
        }

        var itemElements = document.QuerySelectorAll(itemSelector);

        var items = itemElements.Select(el => new ArticleItemDto
        {
            Title = FirstMatchText(el, config.TitleSelectors),
            Summary = FirstMatchText(el, config.SummarySelectors),
            ImageUrl = FirstMatchAttribute(el, config.ImageSelectors, "src"),
            Url = FirstMatchAttribute(el, config.UrlSelectors, "href"),
            PublishedAt = FirstMatchText(el, config.DateSelectors),
        }).ToList();

        if (config.TitleSelectors.Count > 0 && items.Any(i => string.IsNullOrEmpty(i.Title)))
        {
            warnings.Add("Some matched items had no title — check the title selector(s).");
        }

        return new SelectorEvalResponse
        {
            MatchedCount = items.Count,
            Items = items,
            Warnings = warnings,
        };
    }

    private static string JoinSelectors(IEnumerable<string> selectors) =>
        string.Join(", ", selectors.Where(s => !string.IsNullOrWhiteSpace(s)));

    private static string? FirstMatchText(IElement scope, IEnumerable<string> selectors)
    {
        var selector = JoinSelectors(selectors);
        if (string.IsNullOrEmpty(selector)) return null;
        return scope.QuerySelector(selector)?.TextContent?.Trim();
    }

    private static string? FirstMatchAttribute(IElement scope, IEnumerable<string> selectors, string attribute)
    {
        var selector = JoinSelectors(selectors);
        if (string.IsNullOrEmpty(selector)) return null;
        return scope.QuerySelector(selector)?.GetAttribute(attribute);
    }
}
