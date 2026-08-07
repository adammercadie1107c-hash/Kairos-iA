export function mergeExtractedInfo(
  existing: Record<string, string>,
  incoming: Record<string, string> | undefined,
): Record<string, string> {
  if (!incoming || Object.keys(incoming).length === 0) return existing;

  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;
    const trimmed = String(value).trim();
    if (!trimmed) continue;

    const existingValue = merged[key]?.trim();
    if (existingValue && trimmed.length < existingValue.length) continue;

    merged[key] = trimmed;
  }

  return merged;
}
