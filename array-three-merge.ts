/**
* Performs a three-way merge of arrays of primitives, respecting order and duplicates.
* @param baseline The common baseline version of the array.
* @param client The client's version of the array.
* @param server The server's version of the array, which takes precedence in conflicts.
* @returns The merged array.
*/

export default function threeWayMergeOrdered<T extends string | number>(
  baseline: T[],
  client: T[],
  server: T[]
): T[] {
  const mergedArray: T[] = [];

  // Pointers for each array
  let bIndex = 0;
  let cIndex = 0;
  let sIndex = 0;

  while (bIndex < baseline.length || cIndex < client.length || sIndex < server.length) {
    const bItem = baseline[bIndex];
    const cItem = client[cIndex];
    const sItem = server[sIndex];

    // Case 1: All arrays are in sync.
    if (bItem === cItem && cItem === sItem) {
      if (bItem !== undefined) {
        mergedArray.push(bItem);
      }

      bIndex++;
      cIndex++;
      sIndex++;

      continue;
    }

    // Case 2: Server made a change. Server has precedence.
    if (sItem !== bItem) {
      // It's a server change, either an addition or a replacement.
      // If the client also changed it, the server's version still wins.
      mergedArray.push(sItem);
      sIndex++;

      // Try to re-sync client and baseline with the server.
      // This is the core logic for handling insertions and deletions.
      const nextSItem = server[sIndex];
      if (nextSItem !== undefined) {

        const nextCIndex = client.indexOf(nextSItem, cIndex);

        if (nextCIndex !== -1) {
          cIndex = nextCIndex;
        }

        const nextBIndex = baseline.indexOf(nextSItem, bIndex);
        if (nextBIndex !== -1) {
          bIndex = nextBIndex;
        }
      }

      continue;
    }



    // Case 3: Client made a change, but server didn't. Accept the client change.
    if (cItem !== bItem && sItem === bItem) {
      mergedArray.push(cItem);
      cIndex++;

      // Try to re-sync server and baseline.
      const nextCItem = client[cIndex];
      if (nextCItem !== undefined) {
        const nextBIndex = baseline.indexOf(nextCItem, bIndex);

        if (nextBIndex !== -1) {
          bIndex = nextBIndex;
        }

        const nextSIndex = server.indexOf(nextCItem, sIndex);
        if (nextSIndex !== -1) {
          sIndex = nextSIndex;
        }
      }

      continue;
    }



    // Case 4: Item was deleted from baseline.
    // If the server still has it, the server wins. If server deleted it too, it's a mutual delete.
    // This logic is mostly handled by the above server-precedence case.
    // The following advances past any deletions.
    bIndex++;
  }

  return mergedArray;
}
