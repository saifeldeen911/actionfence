import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const llmsDocs = {
  "llms.txt": fileURLToPath(new URL("../../../llms.txt", import.meta.url)),
  "llms-full.txt": fileURLToPath(
    new URL("../../../llms-full.txt", import.meta.url),
  ),
} as const;

export async function readLlmsDoc(
  fileName: keyof typeof llmsDocs,
): Promise<string> {
  return readFile(llmsDocs[fileName], "utf8");
}
