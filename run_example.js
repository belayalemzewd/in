/* eslint-disable no-undef */
const espree = require("espree");
const pLimit = require("p-limit");

/**
 * This script demonstrates using the provided libraries.
 */
async function main() {
    // 1. Using Espree to parse code into an AST
    const code = 'const message = "Hello World";';
    const ast = espree.parse(code, { ecmaVersion: "latest" });
    console.log("--- AST Output ---");
    console.log(`Node Type: ${ast.type}`);
    console.log(`First Statement Type: ${ast.body[0].type}`);

    // 2. Using p-limit to handle concurrent tasks
    const limit = pLimit(2); // Limit to 2 concurrent promises
    const tasks = [
        limit(() => Promise.resolve("Finished Task A")),
        limit(() => Promise.resolve("Finished Task B")),
    ];

    const results = await Promise.all(tasks);
    console.log("\n--- Concurrency Results ---");
    console.log(results);
}

main().catch(console.error);
