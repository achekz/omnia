import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
]);

function collectJavaScriptFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        return [];
      }

      return collectJavaScriptFiles(fullPath);
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      return [fullPath];
    }

    return [];
  });
}

const files = collectJavaScriptFiles(serverRoot);
const failures = [];

for (const file of files) {
  const relativePath = path.relative(serverRoot, file);

  try {
    const source = fs.readFileSync(file, "utf8");
    new vm.SourceTextModule(source, {
      identifier: relativePath,
    });
  } catch (error) {
    failures.push({
      file: relativePath,
      output: error?.stack || error?.message || String(error),
    });
  }
}

if (failures.length > 0) {
  console.error("Backend syntax check failed.\n");

  for (const failure of failures) {
    console.error(`- ${failure.file}`);
    if (failure.output) {
      console.error(failure.output);
    }
    console.error("");
  }

  process.exit(1);
}

console.log(`Backend syntax check passed for ${files.length} files.`);
