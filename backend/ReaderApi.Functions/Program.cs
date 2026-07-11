using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration(config =>
    {
        config.AddEnvironmentVariables();
    })
    .ConfigureServices((context, services) =>
    {
        var config = context.Configuration;

        services.AddHttpClient("feeds", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("LocalNewsAggregator/1.0 (+self-hosted)");
        });

        services.AddSingleton(_ =>
        {
            var connectionString = config["SyncStorageConnectionString"]
                ?? throw new InvalidOperationException("SyncStorageConnectionString is not configured.");
            var containerName = config["SyncContainerName"] ?? "sync-data";

            var serviceClient = new BlobServiceClient(connectionString);
            var container = serviceClient.GetBlobContainerClient(containerName);
            container.CreateIfNotExists();
            return container;
        });
    })
    .Build();

host.Run();
