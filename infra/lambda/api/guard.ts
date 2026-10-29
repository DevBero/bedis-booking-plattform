// Abuse protection and slot locks in one DynamoDB table (pk, TTL attribute "expires"): request counters per IP
// hash, single-use proof-of-work challenges, short locks against double bookings, and monthly counters.
import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { createHash, randomUUID } from "node:crypto";
import { resolveMx } from "node:dns/promises";

const db = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME!;
const HOUR = 3600;
export const DAY = 24 * HOUR;

// Only a shortened, salted hash of the IP is stored, and only until its counting window ends
function ipKey(ip: string) {
  return createHash("sha256").update(`${process.env.IP_SALT}:${ip}`).digest("hex").slice(0, 24);
}

// False once the IP has used up its requests for this action in the current window
export async function withinLimit(ip: string, action: string, limit: number, windowSeconds = HOUR) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const { Attributes } = await db.send(
    new UpdateItemCommand({
      TableName: TABLE,
      Key: { pk: { S: `rate#${action}#${ipKey(ip)}#${windowSeconds}#${window}` } },
      UpdateExpression: "ADD hits :one SET expires = :expires",
      ExpressionAttributeValues: { ":one": { N: "1" }, ":expires": { N: String((window + 1) * windowSeconds) } },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  return Number(Attributes?.hits?.N ?? 0) <= limit;
}

// Monthly counter, e.g. visits per source ("qr", "direct"); kept for about 13 months
export async function count(key: string) {
  const month = new Date().toISOString().slice(0, 7);
  await db.send(
    new UpdateItemCommand({
      TableName: TABLE,
      Key: { pk: { S: `stat#${key}#${month}` } },
      UpdateExpression: "ADD hits :one SET expires = if_not_exists(expires, :expires)",
      ExpressionAttributeValues: { ":one": { N: "1" }, ":expires": { N: String(Math.floor(Date.now() / 1000) + 400 * DAY) } },
    }),
  );
}

// Invisible bot check instead of a captcha: the browser searches a nonce whose SHA-256 starts with DIFFICULTY
// zero bits (src/lib/form-guard.ts, well under a second). Each challenge works once, for an hour, and not
// sooner than MIN_FILL_MS after it was issued.
const DIFFICULTY = 15;
const MIN_FILL_MS = 3000;

export async function issueChallenge() {
  const id = randomUUID().replaceAll("-", "");
  await db.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: { pk: { S: `challenge#${id}` }, issued: { N: String(Date.now()) }, expires: { N: String(Math.floor(Date.now() / 1000) + HOUR) } },
    }),
  );
  return { id, difficulty: DIFFICULTY };
}

function zeroBits(hash: Buffer) {
  let bits = 0;
  for (const byte of hash) {
    if (byte) return bits + Math.clz32(byte) - 24;
    bits += 8;
  }
  return bits;
}

// "ok", "invalid" (unknown, used, expired or unsolved) or "too_fast" (no person books that quickly)
export async function redeemChallenge(id: unknown, nonce: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id) || typeof nonce !== "string" || nonce.length > 20) return "invalid";
  if (zeroBits(createHash("sha256").update(`${id}:${nonce}`).digest()) < DIFFICULTY) return "invalid";
  const { Attributes } = await db.send(new DeleteItemCommand({ TableName: TABLE, Key: { pk: { S: `challenge#${id}` } }, ReturnValues: "ALL_OLD" }));
  if (!Attributes || Number(Attributes.expires.N) * 1000 < Date.now()) return "invalid";
  return Date.now() - Number(Attributes.issued.N) < MIN_FILL_MS ? "too_fast" : "ok";
}

// Lock granularity. 5 minutes so back-to-back services of any length never share a unit; a DynamoDB
// transaction takes at most 100 items, which covers services up to 8 hours.
const UNIT_MS = 5 * 60_000;
// The lock only has to bridge "check the calendar in Sanity" -> "create the booking" (a few seconds). After that
// the booking in Sanity itself takes the slot, so a booking cancelled in the Studio frees it immediately.
const LOCK_SECONDS = 60;

function units(start: number, end: number) {
  const keys: string[] = [];
  for (let t = Math.floor(start / UNIT_MS) * UNIT_MS; t < end; t += UNIT_MS) keys.push(`slot#${new Date(t).toISOString()}`);
  return keys.slice(0, 100);
}

// Claims every unit of [start, end) at once; false if any of them is held by a parallel booking
export async function lockSlot(start: number, end: number) {
  const now = Math.floor(Date.now() / 1000);
  try {
    await db.send(
      new TransactWriteItemsCommand({
        TransactItems: units(start, end).map((pk) => ({
          Put: {
            TableName: TABLE,
            Item: { pk: { S: pk }, expires: { N: String(now + LOCK_SECONDS) } },
            // TTL deletion is lazy, so an expired lock counts as free
            ConditionExpression: "attribute_not_exists(pk) OR expires < :now",
            ExpressionAttributeValues: { ":now": { N: String(now) } },
          },
        })),
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof TransactionCanceledException || error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

export async function unlockSlot(start: number, end: number) {
  await Promise.all(units(start, end).map((pk) => db.send(new DeleteItemCommand({ TableName: TABLE, Key: { pk: { S: pk } } }))));
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

// False if the domain of the address cannot receive mail. DNS trouble on our side lets the address pass.
export async function canReceiveMail(email: string) {
  try {
    const records = await resolveMx(email.slice(email.lastIndexOf("@") + 1));
    return records.some((r) => r.exchange && r.exchange !== ".");
  } catch (error) {
    const code = (error as { code?: string }).code;
    return !(code === "ENOTFOUND" || code === "ENODATA");
  }
}

// Trims every field and checks required ones and lengths; returns the clean values or the first problem
export function validate<K extends string>(body: Record<string, unknown>, rules: Record<K, { required?: boolean; max: number; email?: boolean }>) {
  const clean = {} as Record<K, string>;
  for (const [field, rule] of Object.entries(rules) as [K, { required?: boolean; max: number; email?: boolean }][]) {
    const raw = body[field];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (rule.required && !value) return { error: `${field}_required` } as const;
    if (value.length > rule.max) return { error: `${field}_too_long` } as const;
    if (rule.email && value && !EMAIL.test(value)) return { error: `${field}_invalid` } as const;
    clean[field] = value;
  }
  return { values: clean } as const;
}
