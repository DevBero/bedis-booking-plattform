// Stores a secret in SSM Parameter Store (SecureString) of the project account, read from stdin so it never
// lands in the shell history. Usage: pnpm secret /bedi/sanity/token   (then paste, Enter, Ctrl-D)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const name = process.argv[2];
if (!name?.startsWith("/bedi/")) {
  console.error("Usage: pnpm secret /bedi/<name>  (value from stdin)");
  process.exit(1);
}
console.error(`Wert für ${name} einfügen, dann Enter und Ctrl-D:`);
const value = readFileSync(0, "utf8").trim();
if (!value) {
  console.error("Kein Wert – abgebrochen.");
  process.exit(1);
}
execFileSync(
  "aws",
  ["ssm", "put-parameter", "--region", "eu-north-1", "--name", name, "--type", "SecureString", "--overwrite", "--value", value],
  { stdio: ["ignore", "ignore", "inherit"] },
);
console.error(`✓ ${name} gespeichert`);
