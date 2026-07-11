using System.Net;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace ReaderApi.Functions;

public class SyncFunctions
{
    private const string BlobName = "sync-document.json";
    private readonly BlobContainerClient _container;
    private readonly ILogger<SyncFunctions> _logger;

    public SyncFunctions(BlobContainerClient container, ILogger<SyncFunctions> logger)
    {
        _container = container;
        _logger = logger;
    }

    [Function("GetSync")]
    public async Task<HttpResponseData> Get(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "sync")] HttpRequestData req)
    {
        var blob = _container.GetBlobClient(BlobName);

        if (!await blob.ExistsAsync())
        {
            return req.CreateResponse(HttpStatusCode.NoContent);
        }

        var download = await blob.DownloadContentAsync();
        var res = req.CreateResponse(HttpStatusCode.OK);
        res.Headers.Add("ETag", download.Value.Details.ETag.ToString());
        res.Headers.Add("Content-Type", "application/json");
        await res.WriteStringAsync(download.Value.Content.ToString());
        return res;
    }

    [Function("PutSync")]
    public async Task<HttpResponseData> Put(
        [HttpTrigger(AuthorizationLevel.Function, "put", Route = "sync")] HttpRequestData req)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();

        if (string.IsNullOrWhiteSpace(body))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Request body must contain the sync document JSON.");
            return bad;
        }

        var ifMatch = req.Headers.TryGetValues("If-Match", out var values) ? values.FirstOrDefault() : null;
        var blob = _container.GetBlobClient(BlobName);

        var options = new BlobUploadOptions();
        if (!string.IsNullOrEmpty(ifMatch))
        {
            options.Conditions = new BlobRequestConditions { IfMatch = new ETag(ifMatch) };
        }

        try
        {
            var result = await blob.UploadAsync(BinaryData.FromString(body), options);
            var res = req.CreateResponse(HttpStatusCode.NoContent);
            res.Headers.Add("ETag", result.Value.ETag.ToString());
            return res;
        }
        catch (RequestFailedException ex) when (ex.Status == 412)
        {
            _logger.LogWarning("Sync conflict: If-Match precondition failed.");
            var conflict = req.CreateResponse(HttpStatusCode.PreconditionFailed);
            await conflict.WriteStringAsync("The sync document was updated by another device. Reload and retry.");
            return conflict;
        }
    }
}
