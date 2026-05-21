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
    "Usage: node scripts/split-markdown-topics.js <input-file|input-dir> [output-dir]"
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

function getDefaultOutputDirForDirectory(inputDirPath) {
  // Default to creating a folder in the current working dir named after the input folder
  const inputName = path.basename(inputDirPath);
  return path.join(process.cwd(), toKebabCase(inputName));
}

function extractDayFolderFromFilename(filename) {
  const match = filename.match(/day[\s\-_]*(\d{1,2})/i);
  if (match) return `day-${String(Number(match[1])).padStart(2, "0")}`;
  return null;
}

function extractDayFolderFromContent(content) {
  const m = content.match(/^#\s*day[\s\-:]*?(\d{1,2})/im);
  if (m) return `day-${String(Number(m[1])).padStart(2, "0")}`;
  return null;
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
    const cleanTitle = topicTitle.replace(/\[\^\d+\]/g, "").trim();
    const slug = toKebabCase(cleanTitle);

    if (!slug) {
      throw new Error(`Unable to create a filename for heading: ${fullMatch}`);
    }

    return {
      filename: `${paddedNumber}-${slug}.md`,
      content: `${body.trimEnd().replace(/\[\^\d+\]/g, "")}\n`,
    };
  });
}

function extractTitle(content) {
  const m = /^#\s*(?:\d+\s*[—–-]\s*)?(.*)$/m.exec(content);
  if (m && m[1]) return m[1].trim();
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[0] || "Untitled";
}

function generateIndex(outputBase, sourceName, dayTitleMap) {
  const entries = fs
    .readdirSync(outputBase, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => {
      const da = a.name;
      const db = b.name;
      const ma = /^day-(\d{1,2})$/i.exec(da);
      const mb = /^day-(\d{1,2})$/i.exec(db);
      if (ma && mb) return Number(ma[1]) - Number(mb[1]);
      if (ma && !mb) return -1;
      if (!ma && mb) return 1;
      return da.localeCompare(db);
    });

  const displayTitle = `Full Curriculum Overview — ${sourceName || path.basename(outputBase)}`;
  let out = `# ${displayTitle}\n\n`;
  out += `This index was generated from the \`${sourceName || path.basename(outputBase)}\` folder.\n\n`;

  for (const entry of entries) {
    const dayMatch = /^day-(\d{1,2})$/i.exec(entry.name);
    const dayDir = path.join(outputBase, entry.name);
    const files = fs
      .readdirSync(dayDir)
      .filter((f) => f.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b));

    if (dayMatch) {
      const dayId = String(Number(dayMatch[1]));
      const mappedTitle = dayTitleMap && dayTitleMap[entry.name];
      if (mappedTitle) {
        // Put a plain line starting with "Day N — Title" so parseDayTitle can pick it up
        out += `Day ${Number.parseInt(dayId, 10)} — ${mappedTitle}\n\n`;
      } else {
        out += `Day ${Number.parseInt(dayId, 10)}\n\n`;
      }
    } else {
      out += `${entry.name}\n\n`;
    }

    for (const f of files) {
      const content = fs.readFileSync(path.join(dayDir, f), "utf8");
      let title = extractTitle(content).replace(/\n/g, " ");
      title = title.replace(/\[\^\d+\]/g, "").replace(/\\&/g, "&");
      // Use a checkbox-style list for topics
      out += `- [${title}](${entry.name}/${f})\n`;
    }
    out += "\n";
  }

  const indexPath = path.join(outputBase, "index.md");
  fs.writeFileSync(indexPath, out, "utf8");
  console.log("Wrote index:", indexPath);
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
  const stat = fs.statSync(inputFilePath);

  if (stat.isDirectory()) {
    const mdFiles = fs
      .readdirSync(inputFilePath)
      .filter((f) => f.toLowerCase().endsWith(".md"))
      .sort();

    if (mdFiles.length === 0) {
      throw new Error(`No markdown files found in directory: ${inputFilePath}`);
    }

    const outputBase = outputArg
      ? path.resolve(process.cwd(), outputArg)
      : getDefaultOutputDirForDirectory(inputFilePath);

    fs.mkdirSync(outputBase, { recursive: true });

    const dayTitles = Object.create(null);

    let totalCreated = 0;
    let processedFiles = 0;
    let skippedFiles = 0;

    for (const fileName of mdFiles) {
      const filePath = path.join(inputFilePath, fileName);
      const baseName = path.basename(fileName, path.extname(fileName));

      try {
        const markdown = fs.readFileSync(filePath, "utf8");

        let dayFolder = extractDayFolderFromFilename(baseName);
        if (!dayFolder) dayFolder = extractDayFolderFromContent(markdown);
        if (!dayFolder) dayFolder = toKebabCase(baseName);

        // Try to extract a main "Day N — Title" from the source markdown
        const dayTitleMatch = markdown.match(
          /^#\s*Day\s+\d+\s*[—–-]\s*(.+)$/im
        );
        if (dayTitleMatch && dayTitleMatch[1]) {
          let dt = dayTitleMatch[1].trim();
          // Strip markdown links, remove footnote markers, and unescape any backslash-escaped ampersands
          dt = dt
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
            .replace(/\\&/g, "&")
            .replace(/\[\^\d+\]/g, "");
          dayTitles[dayFolder] = dt;
        }

        const dayDirPath = path.join(outputBase, dayFolder);
        fs.mkdirSync(dayDirPath, { recursive: true });

        const topics = splitMarkdownIntoTopics(markdown);

        for (const topic of topics) {
          const contentToWrite = topic.content
            .replace(/\\&/g, "&")
            .replace(/\[\^\d+\]/g, "");
          fs.writeFileSync(
            path.join(dayDirPath, topic.filename),
            contentToWrite,
            "utf8"
          );
        }

        console.log(`Created ${topics.length} topic files in ${dayDirPath}`);
        totalCreated += topics.length;
        processedFiles += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Skipping ${fileName}: ${msg}`);
        skippedFiles += 1;
      }
    }

    console.log(
      `Processed ${processedFiles} files. Created ${totalCreated} topic files. Skipped ${skippedFiles} files.`
    );

    try {
      generateIndex(outputBase, path.basename(inputFilePath), dayTitles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Index generation failed: ${msg}`);
    }

    return;
  }

  // single file mode
  const outputDirPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : getDefaultOutputDir(inputFilePath);

  const markdown = fs.readFileSync(inputFilePath, "utf8");
  const topics = splitMarkdownIntoTopics(markdown);

  fs.mkdirSync(outputDirPath, { recursive: true });

  for (const topic of topics) {
    const contentToWrite = topic.content
      .replace(/\\&/g, "&")
      .replace(/\[\^\d+\]/g, "");
    fs.writeFileSync(
      path.join(outputDirPath, topic.filename),
      contentToWrite,
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
