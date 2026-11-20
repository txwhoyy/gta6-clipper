// gta6-clipper-01 entry point.
//
// The whole entry is one small file: VIDEO.json, sitting next to this
// script in the bot directory, names the public YouTube Short that the
// entry consists of. Our job is to hand that file to the grader by
// copying it into the output directory — but only after making sure it
// really does name a YouTube video, so a typo'd entry fails loudly here
// instead of silently scoring zero later.

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const botDir = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The three address shapes a YouTube video can be named by. The video
// id is always exactly 11 characters from [A-Za-z0-9_-].
const VIDEO_URL_PATTERNS: RegExp[] = [
  /^https:\/\/www\.youtube\.com\/shorts\/([A-Za-z0-9_-]{11})([?#].*)?$/,
  /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})([&#].*)?$/,
  /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})([?#].*)?$/,
];

function fail(reason: string): never {
  console.error(`gta6-clipper: ${reason}`);
  process.exit(1);
}

interface VideoEntry {
  url: string;
  videoId: string;
  raw: string;
}

function readVideoEntry(): VideoEntry {
  const sourcePath = join(botDir, "VIDEO.json");
  let raw: string;
  try {
    raw = readFileSync(sourcePath, "utf8");
  } catch {
    return fail(`cannot read ${sourcePath}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(`${sourcePath} is not valid JSON`);
  }
  const url = (parsed as { url?: unknown } | null)?.url;
  if (typeof url !== "string" || url.length === 0) {
    return fail('VIDEO.json must be an object with a non-empty string "url"');
  }
  for (const pattern of VIDEO_URL_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      return { url, videoId: match[1], raw };
    }
  }
  return fail(
    `"${url}" is not a YouTube video address ` +
      "(want youtube.com/shorts/<id>, youtube.com/watch?v=<id> or youtu.be/<id>)",
  );
}

function main(): void {
  const entry = readVideoEntry();
  mkdirSync(outputDir, { recursive: true });
  const targetPath = join(outputDir, "VIDEO.json");
  copyFileSync(join(botDir, "VIDEO.json"), targetPath);
  // Read the copy back and compare it byte for byte with the source, so
  // a truncated or half-written hand-off fails here instead of at grading.
  const copied = readFileSync(targetPath, "utf8");
  if (copied !== entry.raw) {
    fail(`copy verification failed: ${targetPath} differs from the source`);
  }
  console.log(
    `gta6-clipper: copied VIDEO.json -> ${targetPath} ` +
      `(video id ${entry.videoId}: ${entry.url})`,
  );
}

main();
