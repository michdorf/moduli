import { test, expect, describe } from "@jest/globals";
import CambMerge from "./camb-merge";
import ArrayDiff from "./array-diff";

describe("Camb merger", () => {
    const arr = new ArrayDiff([1,2,3]);
    const merger = new CambMerge();
    const client = [{UUID: '12', name: "Michele", alder: 23, arr: arr, obj: {id: 1, n: 'na'}}];
    const base = [Object.assign({}, client[0])];
    const server = [Object.assign({}, base[0])];

    test("Can merge client data", () => {
        client[0].name = "Mich";
        const merged = merger.merge(base[0], client[0], server[0]);

        // Reset 
        client[0].name = "Michele";

        expect(merged).toEqual({UUID: '12', name: "Mich", alder: 23, arr: [[0,1],[1,2],[2,3]], obj: {id: 1, n: 'na'}});
    });

    test("Can merge server data", () => {
        server[0].name = "allan";
        
        const merged = merger.merge(base[0], client[0], server[0]);

        expect(merged).toEqual(server[0]);

        server[0].name = "Michele";
    });

    test("Can merge when server and client changed data", () => {
        server[0].name = "allan";
        client[0].name = "Hellen";
        client[0].alder = 100;
        
        const merged = merger.merge(base[0], client[0], server[0]);

        expect(merged).toEqual({UUID: '12', name: "allan", alder: 100, arr: [[0,1],[1,2],[2,3]], obj: {id: 1, n: 'na'}});

        server[0].name = "Michele";
        client[0].name = "Michele";
        client[0].alder = 23;
    });
});

describe("Advanced merge", () => {
    const arr = new ArrayDiff([1,2,3]);
    const merger = new CambMerge();
    const client = [{UUID: '12', name: "Michele", alder: 23, arr: arr.toArray(), obj: {id: 1, n: 'na'}}];
    const base = [Object.assign({}, client[0])];
    const server = [Object.assign({}, base[0])];

    test("Can merge arrays with array diff", () => {
        server[0].arr = new ArrayDiff([1,3,3]).toArray();
        client[0].obj = {id:1, n: "mm"};

        const merged = merger.merge(base[0], client[0], server[0]);
        console.log(merged);
        expect(merged).toEqual({UUID: '12', name: "Michele", alder: 23, arr: [[0,1],[1,3],[2,3]], obj: {id: 1, n: 'mm'}});
    });
});
