import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDirectory, "../../train-schedules.json");
const target = resolve(scriptDirectory, "../data/train-schedules.json");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Copied schedule data from ${source} to ${target}`);
