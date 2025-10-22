/** TODO:
    - should be able to handle deletions (see array-diff)
    - Be aware that no base is given - simply a changed-object/cell
    - Be able to work recursively in depth and recognize advanced Arrays with keys (Array.isArray with Array.isArray inside
    - Ignore simple 1d arrays and treat as strings
*/

import threeWayMergeOrdered from "../array-three-merge";
import assert from "../assert";
import ArrayDiff, { TArrayDiff } from "./array-diff";

type TRiga = Record<string, unknown>;

export default class CambMerge {
    combineKeys(...m: Array<TRiga>): Set<string> {
        const r = new Set<string>();
        for (let obj of m) {
            Object.keys(obj).forEach(k => {
                r.add(k);
            });
        }
        return r;
    }

    get(obj: Record<string, unknown>, key: string) {
        return obj.hasOwnProperty(key) ? obj[key] : undefined;
    }

    merge(base: TRiga, client: TRiga, server: TRiga): TRiga {
            const merged: TRiga = {};
            Object.keys(base).forEach((key) => {
                const baseValue = this.get(base, key);
                const clientValue = this.get(client, key);
                const serverValue = this.get(server, key);

                if (Array.isArray(baseValue)) {
                    if (baseValue.length && Array.isArray(baseValue[0])) {
                        assert(ArrayDiff.isValidArray(clientValue as TArrayDiff<unknown>), "Client value is not keyed");
                        assert(ArrayDiff.isValidArray(serverValue as TArrayDiff<unknown>), "Server value is not keyed");
                        const baseA = ArrayDiff.load(baseValue as TArrayDiff<unknown>);
                        const serverA = ArrayDiff.load(serverValue as TArrayDiff<unknown>);
                        const a = new ArrayDiff();
                        a.fromArray(clientValue as TArrayDiff<unknown>);
                        a.merge(baseA.value, serverA.value);
                        merged[key] = a.toArray();
                    } else {
                        merged[key] = threeWayMergeOrdered(baseValue, clientValue as Array<string | number>, serverValue as Array<string | number>);
                    }
                } else if (serverValue !== baseValue) {
                    merged[key] = serverValue;
                } else {
                    merged[key] = clientValue;
                }
            });

            return merged;
        }
}
