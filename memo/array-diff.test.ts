import { test, expect, describe } from "@jest/globals";
import threeWayMergeOrdered from "../array-three-merge";
import ArrayDiff from "./array-diff";

describe("Array diff", () => {
    const a = ArrayDiff.fromUnKeyedArray(["Allan", "Egon Olsen", "Børge"]);

    test("Works?", () => {
        expect(a.value).toEqual(new Map([[0, "Allan"], [1, "Egon Olsen"], [2, "Børge"]]));
        expect(a.toArray()).toEqual([[0, "Allan"], [1, "Egon Olsen"], [2, "Børge"]]);
    });

    test("Detects changes", () => {
        const base = ArrayDiff.load([[0,"Allan"], [1, "Ols"], [3, "Illum"]]);
        const r = a.difference(a.value, base.value);
        expect(r).toEqual(new Map([[1, "cOls"], [2, "d"], [3, "aIllum"]]));
    });

    test("Can merge client data", () => {
        const base = ArrayDiff.fromUnKeyedArray(["Allan", "Ols", "Illum"]);
        const master = base;
        const merged = a.merge(base.value, master.value);
        expect(merged).toEqual(new Map([[0, "Allan"], [1, "Egon Olsen"], [2, "Børge"]]));
    });

    test("Can merge server data", () => {
        const base = a.value;
        const master = ArrayDiff.load([[0,"Allan"], [1, "Ols"], [3, "Illum"]]);
        const merged = a.merge(base, master.value);
        expect(merged).toEqual(new Map([[0, "Allan"], [1, "Ols"], [3, "Illum"]]));
    });

    test("Can merge when server and client changed data", () => {
        const base = ArrayDiff.fromUnKeyedArray(["Allan", "Ols", "Gudrun", "Illum"]);
        const master = [[0, "Allan"], [1, "Olsen"], [3, "Illi"]] as Array<[number, string]>;
        const merged = a.merge(base.value, ArrayDiff.load(master).value);
        expect(merged).toEqual(new Map([[0, "Allan"], [1, "Olsen"], [3, "Illi"]]));
    });
});

describe("ThreeWayMerge", () => {
    test("Works", () => {
       let base = ["allan", "pia", "mater"];
       let client = ["allan", "pia", "mater", "ekstra"];
       let server = ["allan", "pia", "mater2"];

       let result = threeWayMergeOrdered(base, client, server);
       expect(result).toEqual(["allan", "pia", "mater2", "ekstra"]);
     });
})
