// Lists the chats the bot has seen recently (id, type, title), to find the channel ID for infra/config.ts.
// Post something in the channel first; the bot must be an admin there. Token from SSM, never printed.
// Usage: pnpm telegram:chats   [--test <chatId>]  sends a test message to that chat
import { execFileSync } from "node:child_process";

const token = execFileSync(
  "aws",
  ["ssm", "get-parameter", "--region", "eu-north-1", "--name", "/bedi/telegram/token", "--with-decryption", "--query", "Parameter.Value", "--output", "text"],
  { encoding: "utf8" },
).trim();
const api = (method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());

const testIndex = process.argv.indexOf("--test");
if (testIndex > 0) {
  const res = await api("sendMessage", { chat_id: process.argv[testIndex + 1], text: "✅ Test: Buchungs-Benachrichtigungen kommen hier an." });
  console.log(res.ok ? "✓ Testnachricht gesendet" : `✗ ${res.description}`);
  process.exit(res.ok ? 0 : 1);
}

const me = await api("getMe");
if (!me.ok) {
  console.error(`✗ Token ungültig: ${me.description}`);
  process.exit(1);
}
console.log(`Bot: @${me.result.username}`);
const updates = await api("getUpdates", { allowed_updates: ["channel_post", "message", "my_chat_member"] });
const chats = new Map();
for (const u of updates.result ?? []) {
  const chat = (u.channel_post ?? u.message ?? u.my_chat_member)?.chat;
  if (chat) chats.set(chat.id, `${chat.id}  ${chat.type}  ${chat.title ?? chat.username ?? ""}`);
}
console.log(chats.size ? [...chats.values()].join("\n") : "Keine Chats gefunden. Bot als Admin in den Channel aufnehmen, dort etwas posten, nochmal ausführen.");
