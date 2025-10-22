/**
 * Performs a three-way merge of arrays of primitives, respecting order and duplicates.
 * Server changes take precedence over client conflicts.
 */
export default function threeWayMergeOrdered<T extends string | number>(
  baseline: T[],
  client: T[],
  server: T[]
): T[] {
  // Helper: build change sets relative to baseline
  const diff = (a: T[], b: T[]) => {
    const added: T[] = [];
    const removed: T[] = [];

    const aSet = new Set(a);
    const bSet = new Set(b);

    for (const item of a) if (!bSet.has(item)) removed.push(item);
    for (const item of b) if (!aSet.has(item)) added.push(item);

    return { added, removed };
  };

  const clientDiff = diff(baseline, client);
  const serverDiff = diff(baseline, server);

  // Start with the baseline
  let result = baseline.filter(x => !serverDiff.removed.includes(x));

  // Apply server additions first (server takes precedence)
  for (const item of serverDiff.added) {
    if (!result.includes(item)) result.push(item);
  }

  // Apply client additions where they don’t conflict
  for (const item of clientDiff.added) {
    if (!result.includes(item)) result.push(item);
  }

  return result;
}
