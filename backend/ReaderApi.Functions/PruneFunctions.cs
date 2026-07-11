using System.Text.Json;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using ReaderApi.Functions.Dtos;

namespace ReaderApi.Functions;

public class PruneFunctions
{
    private const string BlobName = "sync-document.json";
    private readonly BlobContainerClient _container;
    private readonly ILogger<PruneFunctions> _logger;

    public PruneFunctions(BlobContainerClient container, ILogger<PruneFunctions> logger)
    {
        _container = container;
        _logger = logger;
    }

    [Function("PruneTombstones")]
    public async Task Prune([TimerTrigger("0 0 3 * * *")] TimerInfo timer)
    {
        var blob = _container.GetBlobClient(BlobName);

        if (!await blob.ExistsAsync())
        {
            _logger.LogInformation("No sync document yet; nothing to prune.");
            return;
        }

        var download = await blob.DownloadContentAsync();
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var doc = JsonSerializer.Deserialize<SyncDocument>(download.Value.Content.ToString(), options);

        if (doc is null)
        {
            _logger.LogWarning("Sync document could not be parsed; skipping prune.");
            return;
        }

        var retentionDays = doc.Settings.TombstoneRetentionDays > 0 ? doc.Settings.TombstoneRetentionDays : 30;
        var cutoff = DateTimeOffset.UtcNow.AddDays(-retentionDays);

        var foldersBefore = doc.Folders.Count;
        var feedsBefore = doc.Feeds.Count;

        doc.Folders = doc.Folders.Where(f => f.DeletedAt is null || f.DeletedAt > cutoff).ToList();
        doc.Feeds = doc.Feeds.Where(f => f.DeletedAt is null || f.DeletedAt > cutoff).ToList();

        var droppedFolders = foldersBefore - doc.Folders.Count;
        var droppedFeeds = feedsBefore - doc.Feeds.Count;

        if (droppedFolders == 0 && droppedFeeds == 0)
        {
            _logger.LogInformation("Prune run: nothing older than {RetentionDays} days.", retentionDays);
            return;
        }

        doc.UpdatedAt = DateTimeOffset.UtcNow;
        var json = JsonSerializer.Serialize(doc, options);
        await blob.UploadAsync(BinaryData.FromString(json), overwrite: true);

        _logger.LogInformation(
            "Pruned {DroppedFolders} folder tombstone(s) and {DroppedFeeds} feed tombstone(s) older than {RetentionDays} days.",
            droppedFolders, droppedFeeds, retentionDays);
    }
}
