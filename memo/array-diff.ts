import assert from "../assert";

export type TArrayDiff<T> = Array<[number, T]>;
type TChange = "a" | "d" | "c"; // add, delete, change

export default class ArrayDiff<T> {
    value: Map<number, T> = new Map();

    constructor(value?: TArrayDiff<T>) {
        if (value)
            this.fromArray(value);
    }

    static fromUnKeyedArray<T>(array: Array<T>): ArrayDiff<T> {
        return new ArrayDiff<T>(array.map((v, i) => [i, v]));
    }

    static isValidArray<T>(array: TArrayDiff<T>) {
        return array.length === 0 || (Array.isArray(array) && Array.isArray(array[0]));
    }

    /**
     * Converts a keyed array to a ArrayDiff object
     * @param value must be set up correctly: [[0, "a"], [1, "b"]]
     */
    fromArray(value: TArrayDiff<T>) {
        assert(ArrayDiff.isValidArray(value), "Array needs to be keyed array in from Array");
        this.value = new Map(value); 
    }

    /** Obs. if array is already in right TArrayDiff<T> format then run .load(array) */
    static fromArray<T>(value: Array<T>) {
        const r = new Map<number, T>();
        for (let i = 0; i < value.length; i++) {
            r.set(i, value[i]);
        }

        return r;
    }

    /** @deprecated use fromArray instead */
    load(state: TArrayDiff<T>){
        assert(ArrayDiff.isValidArray(state), "Array needs to be keyed array in from Array");
        this.value = new Map(state);
    }

    static load<T>(state: TArrayDiff<T>) {
        const a = new ArrayDiff<T>([]);
        a.load(state);
        return a;
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
        console.log(this.value, [...this.value]);
        return [...this.value];
    }

    toString() {
        return JSON.stringify(this.value);
    }
}
