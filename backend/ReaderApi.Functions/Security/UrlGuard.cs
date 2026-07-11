using System.Net;

namespace ReaderApi.Functions.Security;

public static class UrlGuard
{
    public static bool IsAllowed(string? url, out string reason)
    {
        reason = "";

        if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            reason = "URL is missing or not absolute.";
            return false;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            reason = "Only http and https URLs are allowed.";
            return false;
        }

        var host = uri.Host.ToLowerInvariant();
        if (host is "localhost" or "0.0.0.0" || host.EndsWith(".local"))
        {
            reason = "Requests to local hostnames are not allowed.";
            return false;
        }

        if (IPAddress.TryParse(host, out var literalIp))
        {
            if (IsPrivateOrReserved(literalIp))
            {
                reason = "Requests to private or reserved IP ranges are not allowed.";
                return false;
            }
        }

        return true;
    }

    private static bool IsPrivateOrReserved(IPAddress ip)
    {
        var bytes = ip.GetAddressBytes();
        if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            return bytes[0] == 10
                || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || bytes[0] == 127
                || (bytes[0] == 169 && bytes[1] == 254);
        }

        return IPAddress.IsLoopback(ip)
            || ip.IsIPv6LinkLocal
            || ip.IsIPv6SiteLocal
            || (bytes[0] & 0xfe) == 0xfc;
    }
}
