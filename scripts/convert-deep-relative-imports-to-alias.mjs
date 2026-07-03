import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      walk(fullPath, output);
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      output.push(fullPath);
    }
  }

  return output;
}

function toAliasPath(importingFilePath, specifier) {
  const importingDir = path.dirname(importingFilePath);
  const resolvedPath = path.resolve(importingDir, specifier);
  const relativeToSrc = path.relative(srcRoot, resolvedPath);

  if (relativeToSrc.startsWith('..') || path.isAbsolute(relativeToSrc)) {
    return null;
  }

  const normalized = relativeToSrc.split(path.sep).join('/');
  return `@/${normalized}`;
}

function replaceSpecifier(filePath, sourceText, pattern) {
  let replacements = 0;

  const updatedText = sourceText.replace(pattern, (fullMatch, prefix, specifier, suffix) => {
    if (!specifier.startsWith('../../../')) {
      return fullMatch;
    }

    const aliasPath = toAliasPath(filePath, specifier);
    if (!aliasPath) {
      return fullMatch;
    }

    replacements += 1;
    return `${prefix}${aliasPath}${suffix}`;
  });

  return { updatedText, replacements };
}

const files = walk(srcRoot);
let changedFiles = 0;
let totalReplacements = 0;

const patterns = [
  /(\bfrom\s+['"])(\.\.\/(?:\.\.\/)+[^'"]*)(['"])/g,
  /(\bimport\(\s*['"])(\.\.\/(?:\.\.\/)+[^'"]*)(['"]\s*\))/g,
  /(^\s*import\s+['"])(\.\.\/(?:\.\.\/)+[^'"]*)(['"])/gm,
];

for (const filePath of files) {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;
  let fileReplacements = 0;

  for (const pattern of patterns) {
    const result = replaceSpecifier(filePath, updated, pattern);
    updated = result.updatedText;
    fileReplacements += result.replacements;
  }

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    changedFiles += 1;
    totalReplacements += fileReplacements;
  }
}

console.log(`Changed files: ${changedFiles}`);
console.log(`Import replacements: ${totalReplacements}`);
