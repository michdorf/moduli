/** TODO:
    - should be able to handle deletions (see array-diff)
    - Be aware that no base is given - simply a changed-object/cell
    - Be able to work recursively in depth and recognize advanced Arrays with keys (Array.isArray with Array.isArray inside
    - Ignore simple 1d arrays and treat as strings
*/

import ArrayDiff from "./array-diff";

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
        const concatKeys = this.combineKeys(client, server);

        const a = new ArrayDiff();
        const merged: TRiga = {};
        Object.keys(base).forEach((key) => {
            if (typeof base === "object" && (Array.isArray(this.get(base, key)))) {
                const baseA = ArrayDiff.fromArray(this.get(base, key) as unknown[]);
                const serverA = ArrayDiff.fromArray(this.get(server, key) as unknown[]);
                a.fromArray(this.get(client, key) as unknown[]);
                a.merge(baseA, serverA);
                merged[key] = a.toArray();
            } else if (this.get(server, key) !== this.get(base, key)) {
                merged[key] = server[key];
            } else {
                merged[key] = client[key];
            }
        });

        /* concatKeys.forEach(key => {
            const tmp = this.get(server, key) || this.get(client, key);
            if (typeof tmp === "object") {
                if (Array.isArray(tmp)) {
                    return (a.merge(ArrayDiff.fromArray(tmp))
                }
            }
            if (this.get(server, key) !== this.get(base, key)) { // Server has changed
                if (!server.hasOwnProperty(key)) { // deleted on server - remove it
                    return;
                }
                merged.set(key, server[key]);
            } else {
                if (!client.hasOwnProperty(key)) { // deleted on client
                    return;
                }
                merged.set(key, this.get(client, key));
            }
        }); */

        return merged;
    }
}
