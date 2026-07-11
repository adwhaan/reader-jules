namespace ReaderApi.Functions.Dtos;

public class ArticleItemDto
{
    public string? Title { get; set; }
    public string? Summary { get; set; }
    public string? ImageUrl { get; set; }
    public string? Url { get; set; }
    public string? PublishedAt { get; set; }
}

public class SelectorEvalResponse
{
    public int MatchedCount { get; set; }
    public List<ArticleItemDto> Items { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}
