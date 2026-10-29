import assert from "node:assert/strict";
import { it } from "node:test";
import { normalizePhone } from "./phone";

it("normalizes German and international numbers", () => {
  assert.equal(normalizePhone("0171 123 45 67"), "+491711234567");
  assert.equal(normalizePhone("(030) 123456-78"), "+493012345678");
  assert.equal(normalizePhone("+49 171 1234567"), "+491711234567");
  assert.equal(normalizePhone("0043 664 1234567"), "+436641234567");
  assert.equal(normalizePhone("+90 532 123 45 67"), "+905321234567");
});

it("rejects junk", () => {
  assert.equal(normalizePhone("hallo"), null);
  assert.equal(normalizePhone("123"), null);
  assert.equal(normalizePhone("0171 abc"), null);
  assert.equal(normalizePhone("+0 123 456 789"), null);
});
