import { createUserWithPassword } from "../src/auth";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] ?? "Test User";
  const user = await createUserWithPassword({ name, email, password });
  console.log(JSON.stringify(user));
  process.exit(0);
}

main();
