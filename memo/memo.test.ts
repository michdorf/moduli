import { test, expect } from "@jest/globals";
import Memo from "./memo";

test("Works?", () => {
  const m = new Memo("test", [
    {
      nome: "test",
      usaPGP: false,
    },
  ]);
  expect(m.tabelle[0].nome).toBe("test");
});
