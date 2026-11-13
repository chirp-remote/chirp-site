// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Fabrintek Engenharia Digital Ltda

import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

// The link page shows a link only if Chirp would open it. Both are tested
// against the same cases: test/link-fragments.json is Chirp's
// client/testdata/link-fragments.json, at the commit test/chirp-vectors.lock
// pins.
describe("the link page shows the links Chirp opens, and no others", () => {
  const code = readFileSync(resolve(import.meta.dir, "site.js"), "utf8");
  const found = code.match(/var ok = \/(\^[^\n]*\$)\/\.test\(token\);/g) || [];

  test("site.js checks the fragment with one pattern", () => {
    expect(found.length).toBe(1);
  });

  const pattern = new RegExp(found[0].match(/\/(\^.*\$)\//)[1]);
  const vector = JSON.parse(readFileSync(resolve(import.meta.dir, "../../test/link-fragments.json"), "utf8"));

  for (const c of vector.cases) {
    test(`${c.why}: ${c.link ? "shown" : "not shown"}`, () => {
      expect(pattern.test(c.fragment)).toBe(c.link);
    });
  }
});
