const fs = require("node:fs");
const path = require("node:path");

const SLUG_REPLACEMENTS = [
  [/!==/g, " not-equal-equal "],
  [/===/g, " triple-equals "],
  [/!=/g, " not-equal "],
  [/==/g, " double-equals "],
  [/=>/g, " arrow "],
  [/\?\./g, " optional-chaining "],
  [/\?\?=/g, " nullish-coalescing-assignment "],
  [/&&=/g, " logical-and-assignment "],
  [/\|\|=/g, " logical-or-assignment "],
  [/\?\?/g, " nullish-coalescing "],
  [/&&/g, " and "],
  [/\|\|/g, " or "],
];

function printUsage() {
  console.log(
    "Usage: node scripts/split-markdown-topics.js <input-file> [output-dir]"
  );
}

function toKebabCase(value) {
  let normalized = value.replaceAll(
    /\s*\((?:`[^`]+`(?:\s*,\s*`[^`]+`)*)\)\s*/g,
    " "
  );

  for (const [pattern, replacement] of SLUG_REPLACEMENTS) {
    normalized = normalized.replaceAll(pattern, replacement);
  }

  return normalized
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[`'"]/g, "")
    .replaceAll("&", " ")
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .replaceAll(/-+/g, "-")
    .toLowerCase();
}

function getDefaultOutputDir(inputFilePath) {
  const inputDir = path.dirname(inputFilePath);
  const inputName = path.basename(inputFilePath, path.extname(inputFilePath));
  return path.join(inputDir, `${inputName}-topics`);
}

function splitMarkdownIntoTopics(content) {
  const headingRegex = /^#\s+(\d{1,2})\s+[—–-]\s+(.+?)\s*$/gm;
  const matches = Array.from(content.matchAll(headingRegex));

  if (matches.length === 0) {
    throw new Error(
      'No subtopic headings found. Expected lines like "# 1 - Title" or "# 1 — Title".'
    );
  }

  return matches.map((match, index) => {
    const [fullMatch, topicNumber, topicTitle] = match;
    const startIndex = match.index;
    const endIndex =
      index + 1 < matches.length ? matches[index + 1].index : content.length;
    const body = content.slice(startIndex, endIndex).trimStart();
    const paddedNumber = String(Number(topicNumber)).padStart(2, "0");
    const slug = toKebabCase(topicTitle);

    if (!slug) {
      throw new Error(`Unable to create a filename for heading: ${fullMatch}`);
    }

    return {
      filename: `${paddedNumber}-${slug}.md`,
      content: `${body.trimEnd()}\n`,
    };
  });
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg) {
    printUsage();
    process.exit(1);
  }

  const inputFilePath = path.resolve(process.cwd(), inputArg);

  if (!fs.existsSync(inputFilePath)) {
    throw new Error(`Input file not found: ${inputFilePath}`);
  }

  const outputDirPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : getDefaultOutputDir(inputFilePath);

  const markdown = fs.readFileSync(inputFilePath, "utf8");
  const topics = splitMarkdownIntoTopics(markdown);

  fs.mkdirSync(outputDirPath, { recursive: true });

  for (const topic of topics) {
    fs.writeFileSync(
      path.join(outputDirPath, topic.filename),
      topic.content,
      "utf8"
    );
  }

  console.log(`Created ${topics.length} topic files in ${outputDirPath}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
