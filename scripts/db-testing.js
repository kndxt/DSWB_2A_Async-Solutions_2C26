// Atajo para cargar la base local con los mismos datos que seed.js.
// Equivale a: npm run seed:local
process.argv.push("--destino=local");
await import("./seed.js");
