import bcrypt from "bcryptjs";
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const password = await rl.question("Enter admin password: ");

  if (password.length < 4) {
    throw new Error("Password must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 4);

  console.log("\nPassword hash:\n");
  console.log(passwordHash);
} finally {
  rl.close();
}