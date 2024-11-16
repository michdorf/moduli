/** @deprecated I don't think it makes sense to convert an array to this
more complex datastructure. It is better to simply use Maps or map-like
structure like [["0": "allan"], ["3", "Bitter"]] etc. like is use for assegnamenti:
[["2024-10-08": 2], ["2023-12-24", 100]]
*/

type TArrayDiff<T> = Array<[number, T]>;
type TChange = "a" | "d" | "c"; // add, delete, change

export default class ArrayDiff<T> {
    value: Map<number, T> = new Map();

    constructor(value?: Array<T>) {
        if (value)
            this.fromArray(value);
    }

    fromArray(value: Array<T>) {
        for (let i = 0; i < value.length; i++) {
            this.value.set(i, value[i]);
        }
    }

    static fromArray<T>(value: Array<T>) {
        const r = new Map<number, T>();
        for (let i = 0; i < value.length; i++) {
            r.set(i, value[i]);
        }

        return r;
    }

    load(state: TArrayDiff<T>){
        this.value = new Map(state);
    }

    static combineKeys<T>(...m: Array<Map<T, unknown>>): Set<T> {
        const r = new Set<T>();
        for (let map of m) {
            map.forEach((_, k) => r.add(k));
        }
        return r;
    }

    parse(val: T) {
        return (typeof val === "object" ? JSON.stringify(val) : val);
    }

    /**
     * Assumes that this is the client version
     * @param base Is the original synched data
     * @param master Is the server's version
     */
    merge(base: Map<number, T>, master: Map<number, T>): Map<number, T> {
        const allKeys = ArrayDiff.combineKeys(master, this.value);

        const merged = new Map();
        allKeys.forEach((key) => {
            if (master.get(key) !== base.get(key)) { // Server has changed
                if (!master.has(key)) { // deleted on server - remove it
                    return;
                }
                merged.set(key, master.get(key));
            } else {
                if (!this.value.has(key)) { // deleted on client
                    return;
                }
                merged.set(key, this.value.get(key));
            }
        });

        return merged;
    }

    difference(base: Map<number, T>, changes: Map<number, T>): Map<number, TChange> {
        const diff = new Map();

        base.forEach((value, key) => {
            if (!changes.has(key)) {
                diff.set(key, "d");
            } else {
                let c = changes.get(key);
                if (c !== value) {
                    diff.set(key, "c" + this.parse(c as T));
                }
            }
        });

        changes.forEach((_, key) => {
            if (!base.has(key)) {
                diff.set(key, "a" + this.parse(changes.get(key) as T));
            }
        });

        return diff;
    }

    toArray(): TArrayDiff<T> {
        return [...this.value];
    }

    toString() {
        return JSON.stringify(this.value);
    }
}
