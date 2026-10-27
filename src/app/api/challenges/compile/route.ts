import { transform } from "esbuild";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SOURCE_LENGTH = 24000;

interface CompileRequestBody {
  source?: string;
  language?: string;
}

// Logic challenges are self-contained modules; any import would fail in the
// test sandbox anyway, so reject it here with a clearer message.
function hasImport(source: string): boolean {
  return (
    /^\s*import\s[\s\S]*?from\s+["'][^"']+["']/m.test(source) ||
    /^\s*import\s+["'][^"']+["']/m.test(source) ||
    /^\s*export\s[\s\S]*?from\s+["'][^"']+["']/m.test(source) ||
    /\brequire\s*\(/.test(source)
  );
}

/**
 * Compiles a logic-challenge module (TS or JS) to plain ESM for the browser
 * test runner. Only transpiles; nothing is executed on the server.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CompileRequestBody;
    const source = (body.source || "").trim();
    const language = body.language === "js" ? "js" : "ts";

    if (!source) {
      return NextResponse.json({ error: "Write some code first." }, { status: 400 });
    }

    if (source.length > MAX_SOURCE_LENGTH) {
      return NextResponse.json({ error: "Code is too large to test." }, { status: 400 });
    }

    if (hasImport(source)) {
      return NextResponse.json(
        { error: "Remove imports: challenge solutions must be a single self-contained file." },
        { status: 400 }
      );
    }

    const result = await transform(source, {
      loader: language,
      format: "esm",
      sourcefile: `solution.${language}`,
      target: "es2020",
    });

    return NextResponse.json({ code: result.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compilation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
