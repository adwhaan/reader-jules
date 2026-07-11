const TRACKING_PARAM_PREFIXES = ['utm_', 'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'];

export function normalizeLink(rawUrl: string): string {
  const url = new URL(rawUrl);

  const paramsToDelete: string[] = [];
  url.searchParams.forEach((_value, key) => {
    const lowerKey = key.toLowerCase();
    if (TRACKING_PARAM_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) {
      paramsToDelete.push(key);
    }
  });
  paramsToDelete.forEach((key) => url.searchParams.delete(key));

  url.hostname = url.hostname.toLowerCase();
  let normalized = url.toString();
  if (normalized.endsWith('/') && url.pathname !== '/') {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export function buildCompositeId(normalizedLink: string, publishedAt?: string): string {
  return publishedAt ? `${normalizedLink}#${publishedAt}` : normalizedLink;
}

export function resolveArticleId(
  normalizedLink: string,
  publishedAt: string | undefined,
  existingIds: ReadonlySet<string>,
): string {
  if (!existingIds.has(normalizedLink)) {
    return normalizedLink;
  }
  return buildCompositeId(normalizedLink, publishedAt);
}
