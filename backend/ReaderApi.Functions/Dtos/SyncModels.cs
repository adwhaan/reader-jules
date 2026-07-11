namespace ReaderApi.Functions.Dtos;

public class SyncDocument
{
    public int SchemaVersion { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<FolderDefinition> Folders { get; set; } = new();
    public List<FeedDefinition> Feeds { get; set; } = new();
    public List<SelectorConfig> SelectorConfigs { get; set; } = new();
    public List<ArticleState> ArticleStates { get; set; } = new();
    public UserSettings Settings { get; set; } = new();
}

public class FolderDefinition
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Order { get; set; }
    public string? ParentId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}

public class FeedDefinition
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "rss";
    public string Title { get; set; } = "";
    public string? FolderId { get; set; }
    public string? XmlUrl { get; set; }
    public string? HtmlUrl { get; set; }
    public string? PageUrl { get; set; }
    public bool Enabled { get; set; } = true;
    public List<string> DefaultTags { get; set; } = new();
    public string? SelectorConfigId { get; set; }
    public int? SelectorConfigVersion { get; set; }
    public DateTimeOffset? LastRefreshAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}

public class SelectorConfig
{
    public string Id { get; set; } = "";
    public int Version { get; set; }
    public List<string> ItemSelectors { get; set; } = new();
    public List<string> TitleSelectors { get; set; } = new();
    public List<string> SummarySelectors { get; set; } = new();
    public List<string> ImageSelectors { get; set; } = new();
    public List<string> UrlSelectors { get; set; } = new();
    public List<string> DateSelectors { get; set; } = new();
    public string? Notes { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class ArticleState
{
    public string ArticleId { get; set; } = "";
    public bool Read { get; set; }
    public bool ReadLater { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTimeOffset UpdatedAt { get; set; }
}

public class UserSettings
{
    public string Theme { get; set; } = "system";
    public int RefreshIntervalMinutes { get; set; } = 30;
    public int StaggerMs { get; set; } = 250;
    public string DefaultView { get; set; } = "all";
    public string? LastActiveFolderId { get; set; }
    public bool AutoRefreshOnFolderSwitch { get; set; } = true;
    public int TombstoneRetentionDays { get; set; } = 30;
}
