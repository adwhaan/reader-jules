namespace ReaderApi.Functions.Dtos;

public class SelectorEvalRequest
{
    public string Url { get; set; } = "";
    public SelectorConfig Config { get; set; } = new();
}
