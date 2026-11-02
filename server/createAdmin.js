
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const User = require("./models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function askPassword(question) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const originalRawMode = stdin.isRaw;

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();

    let password = "";

    function onData(key) {
      if (key.toString() === "\u0003") {
        process.stdout.write("\n");
        cleanup();
        process.exit(1);
      }

      if (key.toString() === "\r" || key.toString() === "\n") {
        process.stdout.write("\n");
        cleanup();
        resolve(password);
        return;
      }

      if (key.toString() === "\u007f") {
        password = password.slice(0, -1);
        return;
      }

      if (key.toString().length === 1) {
        password += key.toString();
      }
    }

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(originalRawMode || false);
    }

    stdin.on("data", onData);
  });
}

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("\nEcoStream Administrator Setup\n");

    const name = await ask("Administrator name: ");
    const email = (await ask("Administrator email: ")).toLowerCase();
    const phone = await ask("Phone number: ");
    const password = await askPassword("Create password (minimum 8 characters): ");

    if (!name || !email || !phone || password.length < 8) {
      throw new Error("Please enter all details and use at least 8 password characters.");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error("This email is already registered. No account was changed.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "Admin",
      isActive: true
    });

    console.log("\nAdministrator account created successfully.");
    console.log("Role: Admin");
    console.log("Email:", email);
    console.log("Password: Hidden");
  } catch (error) {
    console.error("\nSetup failed:", error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();

