import { readLlmsDoc } from "@/lib/llms-docs";

export async function GET() {
  const source = await readLlmsDoc("llms.txt");

  return new Response(source, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
