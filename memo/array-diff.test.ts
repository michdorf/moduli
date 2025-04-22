import { test, expect, describe } from "@jest/globals";
import ArrayDiff from "./array-diff";

describe("Array diff", () => {
    const a = new ArrayDiff(["Allan", "Egon Olsen", "Børge"]);
    
    test("Works?", () => {
        expect(a.value).toEqual(new Map([[0, "Allan"], [1, "Egon Olsen"], [2, "Børge"]]));
        expect(a.toArray()).toEqual(new Map([[0, "Allan"], [1, "Egon Olsen"], [2, "Børge"]]));
    });

    test("Detects changes", () => {
        const base = new Map([[0, "Allan"], [1, "Ols"], [3, "Illum"]]);
        const r = a.difference(a.value, base);
        expect(r).toEqual(new Map([[1, "cOls"], [2, "d"], [3, "aIllum"]]));
    });

    test("Can merge client data", () => {
        const base = new Map([[0, "Allan"], [1, "Ols"], [3, "Illum"]]);
        const master = base;
        const merged = a.merge(base, master);
        expect(merged).toEqual(new Map([[0, "Allan"], [1, "Egon Olsen"], [2, "Børge"]]));
        console.log(merged);
    });

    test("Can merge server data", () => {
        const base = a.value;
        const master = new Map([[0, "Allan"], [1, "Ols"], [3, "Illum"]]);
        const merged = a.merge(base, master);
        expect(merged).toEqual(new Map([[0, "Allan"], [1, "Ols"], [3, "Illum"]]));
        console.log(merged);
    });

    test("Can merge when server and client changed data", () => {
        const base = new Map([[0, "Allan"], [1, "Ols"], [2, "Gudrun"], [3, "Illum"]]);
        const master = new Map([[0, "Allan"], [1, "Olsen"], [3, "Illi"]]);
        const merged = a.merge(base, master);
        expect(merged).toEqual(new Map([[0, "Allan"], [1, "Olsen"], [3, "Illi"]]));
        console.log(merged);
    });
});
