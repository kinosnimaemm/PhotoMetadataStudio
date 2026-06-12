const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = 4328;
const BASE = `http://127.0.0.1:${PORT}`;
let server;
let fixture;

async function waitForServer() {
  for (let index = 0; index < 50; index += 1) {
    try {
      const response = await fetch(`${BASE}/api/profiles`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test server did not start");
}

function formWithFiles(count, overrides = {}) {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    const bytes = fs.readFileSync(fixture);
    form.append("photos", new File([bytes], `photo-${index + 1}.jpg`, { type: "image/jpeg" }));
  }
  form.append("profile", overrides.profile || "usa-iphone-17-pro-max");
  form.append("namingMode", overrides.namingMode || "iphone");
  form.append("startNumber", String(overrides.startNumber || 2001));
  form.append("startDate", overrides.startDate || "2026-06-12T10:00");
  form.append("intervalSeconds", String(overrides.intervalSeconds || 45));
  if (overrides.customProfile) form.append("customProfile", JSON.stringify(overrides.customProfile));
  return form;
}

test.before(async () => {
  fixture = path.join(os.tmpdir(), `metadata-studio-test-${Date.now()}.jpg`);
  execFileSync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "color=c=blue:s=96x128:d=0.1",
    "-frames:v", "1", fixture
  ]);
  server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore"
  });
  await waitForServer();
});

test.after(() => {
  server?.kill("SIGTERM");
  fs.rmSync(fixture, { force: true });
});

test("default profile is the latest iPhone US profile", async () => {
  const response = await fetch(`${BASE}/api/profiles`);
  const profiles = await response.json();
  assert.equal(profiles[0].id, "usa-iphone-17-pro-max");
  assert.equal(profiles[0].tags["EXIF:Model"], "iPhone 17 Pro Max");
  assert.equal(profiles[0].tags["IPTC:City"], "New York");
});

test("reports local runtime capabilities without a database", async () => {
  const runtimeResponse = await fetch(`${BASE}/api/runtime`);
  const runtime = await runtimeResponse.json();
  assert.equal(runtimeResponse.status, 200);
  assert.equal(runtime.mode, "local");
  assert.equal(runtime.localSave, true);

  const healthResponse = await fetch(`${BASE}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.database.configured, false);
});

test("processes ten files with sequential names and timestamps", async () => {
  const response = await fetch(`${BASE}/api/process`, {
    method: "POST",
    body: formWithFiles(10, { startNumber: 3100, intervalSeconds: 30 })
  });
  assert.equal(response.status, 200);
  const batch = await response.json();
  assert.equal(batch.count, 10);
  assert.equal(batch.files[0].name, "IMG_3100.JPG");
  assert.equal(batch.files[9].name, "IMG_3109.JPG");
  assert.equal(
    new Date(batch.files[1].captureDate) - new Date(batch.files[0].captureDate),
    30_000
  );

  const fileResponse = await fetch(`${BASE}/api/download/${batch.token}/0`);
  assert.equal(fileResponse.status, 200);
  const output = path.join(os.tmpdir(), `metadata-output-${Date.now()}.jpg`);
  fs.writeFileSync(output, Buffer.from(await fileResponse.arrayBuffer()));
  const metadata = execFileSync("exiftool", [
    "-j", "-Model", "-City", "-GPSPosition", "-CreatorTool", output
  ], { encoding: "utf8" });
  const [tags] = JSON.parse(metadata);
  assert.equal(tags.Model, "iPhone 17 Pro Max");
  assert.equal(tags.City, "New York");
  assert.equal(tags.CreatorTool, "Metadata Studio");
  fs.rmSync(output, { force: true });
});

test("rejects an eleventh file", async () => {
  const response = await fetch(`${BASE}/api/process`, {
    method: "POST",
    body: formWithFiles(11)
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /максимум 10/);
});

test("applies a custom Android profile with sRGB", async () => {
  const customProfile = {
    name: "Pixel test",
    tags: {
      "EXIF:Make": "Google",
      "EXIF:Model": "Pixel 9 Pro",
      "EXIF:FNumber": "1.68",
      "EXIF:FocalLength": "6.9",
      "EXIF:ISO": "100",
      "EXIF:ExposureTime": "1/100",
      "EXIF:GPSLatitude": "40.758",
      "EXIF:GPSLatitudeRef": "N",
      "EXIF:GPSLongitude": "73.9855",
      "EXIF:GPSLongitudeRef": "W"
    }
  };
  const response = await fetch(`${BASE}/api/process`, {
    method: "POST",
    body: formWithFiles(1, { profile: "custom", customProfile })
  });
  assert.equal(response.status, 200);
  const batch = await response.json();
  const fileResponse = await fetch(`${BASE}/api/download/${batch.token}/0`);
  const output = path.join(os.tmpdir(), `metadata-android-${Date.now()}.jpg`);
  fs.writeFileSync(output, Buffer.from(await fileResponse.arrayBuffer()));
  const [tags] = JSON.parse(execFileSync("exiftool", [
    "-j", "-Make", "-Model", "-ProfileDescription", output
  ], { encoding: "utf8" }));
  assert.equal(tags.Make, "Google");
  assert.equal(tags.Model, "Pixel 9 Pro");
  assert.match(tags.ProfileDescription, /sRGB/);
  fs.rmSync(output, { force: true });
});

test("saving a batch removes temporary download endpoints", async () => {
  const response = await fetch(`${BASE}/api/process`, {
    method: "POST",
    body: formWithFiles(2, { startNumber: 4500 })
  });
  const batch = await response.json();
  assert.equal(response.status, 200);

  const saveDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "metadata-save-"));
  const saveResponse = await fetch(
    `${BASE}/api/save/${batch.token}?directory=${encodeURIComponent(saveDirectory)}`,
    { method: "POST" }
  );
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.count, 2);
  assert.equal(fs.existsSync(saved.path), true);

  const staleDownload = await fetch(`${BASE}/api/download/${batch.token}/0`);
  assert.equal(staleDownload.status, 404);
  fs.rmSync(saveDirectory, { recursive: true, force: true });
});

test("downloads the whole batch as a valid zip and then cleans temporary files", async () => {
  const response = await fetch(`${BASE}/api/process`, {
    method: "POST",
    body: formWithFiles(3, { startNumber: 5200 })
  });
  const batch = await response.json();
  const zipResponse = await fetch(`${BASE}/api/download-batch/${batch.token}`);
  assert.equal(zipResponse.status, 200);
  assert.equal(zipResponse.headers.get("content-type"), "application/zip");
  const zipPath = path.join(os.tmpdir(), `metadata-batch-${Date.now()}.zip`);
  fs.writeFileSync(zipPath, Buffer.from(await zipResponse.arrayBuffer()));
  const listing = execFileSync("/usr/bin/unzip", ["-Z1", zipPath], { encoding: "utf8" });
  assert.match(listing, /IMG_5200\.JPG/);
  assert.match(listing, /IMG_5201\.JPG/);
  assert.match(listing, /IMG_5202\.JPG/);
  const stale = await fetch(`${BASE}/api/download/${batch.token}/0`);
  assert.equal(stale.status, 404);
  fs.rmSync(zipPath, { force: true });
});
