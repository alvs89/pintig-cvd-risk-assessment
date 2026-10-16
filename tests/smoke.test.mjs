import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createHash } from "node:crypto";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const html = read("../index.html");
const js = read("../legacy/extracted-v27.js");
const css = read("../src/styles.css");
const legacy = read("../legacy/PINTIG_Web_Application_v27.html");

test("entry document mounts React; React owns the confirmation dialog", () => {
  assert.match(html, /id="root"/);
  assert.match(
    read("../src/components/ConfirmationDialog.tsx"),
    /id="pintigConfirm"/,
  );
  assert.match(html, /src="\/src\/main\.tsx"/);
  assert.match(read("../src/main.tsx"), /import "\.\/styles\.css"/);
});
test("original v27 reference checksum is unchanged", () => {
  const manifest = JSON.parse(read("../docs/SOURCE_MANIFEST.json"));
  assert.equal(
    createHash("sha256")
      .update(
        fs.readFileSync(
          new URL("../legacy/PINTIG_Web_Application_v27.html", import.meta.url),
        ),
      )
      .digest("hex"),
    manifest.baseline_sha256,
  );
});
test("full JavaScript from original v27 is preserved", () => {
  const found = legacy.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(found, "Original inline application source must exist");
  assert.equal(js.trim(), found[1].trim());
});
test("the original CSS rules remain present", () => {
  const blocks = [...legacy.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  assert.ok(blocks.length > 0);
  for (const [_, ruleblock] of blocks) {
    assert.ok(
      css.includes(ruleblock),
      "Missing a style block from the baseline",
    );
  }
});
test("existing modules and major workflows remain in source", () => {
  const current = read("../src/state/permissions.ts");
  for (const moduleName of [
    "Patient Management",
    "New Risk Assessment",
    "Assessment History",
    "Reports",
    "User Accounts",
    "Audit Logs",
    "Maintenance",
    "Help",
    "About",
  ]) {
    assert.ok(current.includes(moduleName), `Missing module: ${moduleName}`);
  }
  for (const procedure of [
    "generateGuidance",
    "simulate",
    "updateLiveFilters",
    "openPintigConfirm",
  ]) {
    assert.ok(js.includes(procedure), `Missing workflow: ${procedure}`);
  }
});
test("React runtime has no HTML replacement or global event handlers", () => {
  const visit = (dir) =>
    fs
      .readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? visit(dir + "/" + entry.name)
          : /\.tsx?$/.test(entry.name)
            ? [read(dir + "/" + entry.name)]
            : [],
      );
  const runtime = visit("../src").join("\n");
  // Check TypeScript tokens so clinical copy containing "any" is not a false positive.
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.JSX,
    runtime,
  );
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  )
    assert.notEqual(
      token,
      ts.SyntaxKind.AnyKeyword,
      "Avoid explicit any types in runtime code",
    );
  assert.doesNotMatch(
    runtime,
    /innerHTML|dangerouslySetInnerHTML|document\.addEventListener/,
  );
});
test("the source has no external runtime script dependency", () => {
  assert.doesNotMatch(html, /<script[^>]+https?:\/\//);
  assert.doesNotMatch(html, /<link[^>]+https?:\/\//);
});
