// Turns a Trivy JSON report into the pipeline's pass/fail decision, and — more
// importantly — into something actionable.
//
// A bare `trivy --exit-code 1` tells you the build is red but not why: the
// detail is buried in a log only people with repository access can open. This
// prints every blocking finding as a GitHub annotation (package, installed
// version, the version that fixes it) and repeats it in the run summary, so
// whoever hits the gate knows exactly what to bump.
//
// Usage: node .github/scripts/trivy-gate.mjs <report.json> "<what was scanned>"

import fs from "node:fs";

const [file, label = "target"] = process.argv.slice(2);

if (!file || !fs.existsSync(file)) {
  console.log(`::error::trivy-gate — no report at ${file}; the scan itself failed.`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(file, "utf8"));
const vulns = [];
const secrets = [];

for (const result of report.Results ?? []) {
  for (const v of result.Vulnerabilities ?? []) {
    vulns.push({
      target: result.Target,
      pkg: v.PkgName,
      installed: v.InstalledVersion,
      fixed: v.FixedVersion,
      id: v.VulnerabilityID,
      title: (v.Title ?? "").slice(0, 160),
    });
  }
  for (const s of result.Secrets ?? []) {
    secrets.push({ target: result.Target, line: s.StartLine, rule: s.RuleID, title: s.Title });
  }
}

for (const v of vulns) {
  console.log(
    `::error title=CRITICAL ${v.id}::${v.target}: ${v.pkg} ${v.installed} → upgrade to ${v.fixed}. ${v.title}`,
  );
}
for (const s of secrets) {
  console.log(`::error title=Exposed secret::${s.target}:${s.line} — ${s.rule}: ${s.title}`);
}

const total = vulns.length + secrets.length;
const summary = process.env.GITHUB_STEP_SUMMARY;

if (summary) {
  if (total === 0) {
    fs.appendFileSync(summary, `**Trivy gate (${label}): clear** — no fixable CRITICAL findings.\n\n`);
  } else {
    const rows = vulns
      .map((v) => `| \`${v.id}\` | ${v.target} | ${v.pkg} | ${v.installed} | **${v.fixed}** |`)
      .join("\n");
    fs.appendFileSync(
      summary,
      `### :no_entry: Trivy gate failed (${label}) — ${total} blocking finding(s)\n\n` +
        (vulns.length
          ? `| CVE | Where | Package | Installed | Fixed in |\n| --- | --- | --- | --- | --- |\n${rows}\n\n`
          : "") +
        (secrets.length
          ? `Exposed secrets:\n${secrets.map((s) => `- ${s.target}:${s.line} — ${s.rule}`).join("\n")}\n\n`
          : ""),
    );
  }
}

if (total > 0) {
  console.log(
    `::error::Trivy gate (${label}): ${total} fixable CRITICAL finding(s). Upgrade the packages listed above, then re-run.`,
  );
  process.exit(1);
}

console.log(`Trivy gate (${label}): clear — no fixable CRITICAL vulnerabilities or exposed secrets.`);
