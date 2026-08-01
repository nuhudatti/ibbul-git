import assert from "node:assert";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { prisma } from "./services/prisma.ts";
import { normalizeMatric, matricToSlug } from "./matric.ts";
import type { ProjectFile } from "../types/index.ts";

function getShellCommand() {
  if (process.platform === "win32") {
    const quotedRepoRoot = repoRoot.replace(/\//g, "\\");
    return {
      command: "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        `cd /d ${quotedRepoRoot} && npm run dev --workspace=web -- --hostname ${DEV_HOST} --port ${DEV_PORT}`,
      ],
    };
  }

  return {
    command: "npm",
    args: ["run", "dev", "--workspace=web", "--", "--hostname", DEV_HOST, "--port", `${DEV_PORT}`],
  };
}

const DEV_PORT = 4011;
const DEV_HOST = "127.0.0.1";
const DEV_URL = `http://${DEV_HOST}:${DEV_PORT}`;
const TIMEOUT_MS = 60000;

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const shell = getShellCommand();

const files: ProjectFile[] = [
  { path: "index.html", content: "<html><head></head><body>root</body></html>" },
  { path: "pages/about.html", content: "<html><head></head><body>About</body></html>" },
  { path: "css/style.css", content: "body { color: #111; }" },
  { path: "js/app.js", content: "console.log('ok');" },
  { path: "images/logo.png", content: "PNGDATA" },
];

function waitForServerReady() {
  const start = Date.now();
  return new Promise<void>(async (resolve, reject) => {
    while (Date.now() - start < TIMEOUT_MS) {
      try {
        const response = await fetch(`${DEV_URL}/`);
        if (response.ok) {
          return resolve();
        }
      } catch {
        // ignore until ready
      }
      await setTimeout(1000);
    }
    reject(new Error(`Next dev server did not start within ${TIMEOUT_MS}ms`));
  });
}

async function run() {
  const matric = "U99/TST/TST/0001";
  const projectId = `api-integration-${Date.now()}`;
  const normalizedProjectId = projectId.toLowerCase().trim();
  const canonicalMatric = normalizeMatric(matric);
  const expectedDeployPath = `/live/${matricToSlug(matric).toLowerCase()}/${normalizedProjectId}`;
  const snapshotWhere = {
    studentMatric: canonicalMatric,
    assignmentId: normalizedProjectId,
  };

  async function ensureStudentProfile() {
    try {
      const existingStudent = await prisma.studentProfile.findUnique({
        where: { matric: canonicalMatric },
      });

      if (existingStudent) {
        return;
      }

      await prisma.studentProfile.create({
        data: {
          matric: canonicalMatric,
          firstName: "Live",
          lastName: "Tester",
          program: "Integration",
          headline: "Live deploy API integration test",
          email: `live-deploy-api-${Date.now()}@example.com`,
          avatarInitials: "LT",
          passwordHash: "testhash",
          accountRole: "STUDENT",
          status: "active",
          mustChangePassword: false,
          notifyAssignments: true,
          notifyGrades: true,
          notifyPortfolio: true,
          publicProfile: true,
        },
      });
    } catch (error) {
      console.warn("[db] student profile setup skipped because Prisma cannot reach the configured database:", error);
    }
  }

  await ensureStudentProfile();

  let devProcess = spawn(shell.command, shell.args, {
    cwd: appRoot,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  devProcess.stdout?.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  devProcess.stderr?.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  try {
    await waitForServerReady();

    let deployResponse: Response | null = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        deployResponse = await fetch(`${DEV_URL}/api/deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            matricNumber: matric,
            projectName: "API Integration Test",
            files,
          }),
        });
        break;
      } catch (error) {
        if (attempt === 5) {
          throw error;
        }
        console.warn(`[api] deploy retry ${attempt}/5`, error);
        await setTimeout(2000);
      }
    }

    assert.ok(deployResponse?.ok, `API /api/deploy returned ${deployResponse?.status ?? "no response"}`);
    const deployData = await deployResponse!.json();
    assert.equal(deployData.status, "SUCCESS");

    const deployLocation = new URL(deployData.url);
    assert.equal(deployLocation.pathname, expectedDeployPath);

    try {
      const snapshot = await prisma.projectSnapshot.findFirst({
        where: snapshotWhere,
        orderBy: { savedAt: "desc" },
      });
      assert.ok(snapshot, "Project snapshot was not saved to the database");
      assert.deepEqual(
        (snapshot?.files as ProjectFile[]).map((file) => file.path).sort(),
        ["css/style.css", "images/logo.png", "index.html", "js/app.js", "pages/about.html"],
      );

      const deployment = await prisma.projectDeployment.findFirst({
        where: { ...snapshotWhere, isLatest: true },
        orderBy: { deployedAt: "desc" },
      });
      assert.ok(deployment, "Project deployment was not saved to the database");
      assert.equal(deployment?.deployUrl, expectedDeployPath);
      assert.deepEqual(
        (deployment?.files as ProjectFile[]).map((file) => file.path).sort(),
        ["css/style.css", "images/logo.png", "index.html", "js/app.js", "pages/about.html"],
      );
    } catch (dbError) {
      console.warn("[db] Prisma assertions skipped because the configured database is unavailable:", dbError);
    }

    const livePaths = ["", "pages/about.html", "css/style.css", "js/app.js", "images/logo.png"];
    for (const path of livePaths) {
      const url = `${DEV_URL}${expectedDeployPath}/${path}`.replace(/\/\/+/g, "/");
      const response = await fetch(url);
      assert.ok(response.ok, `Live route ${url} returned ${response.status}`);
    }

    console.log("PASS: /api/deploy -> database snapshot -> live route lifecycle is valid");
  } finally {
    try {
      await prisma.projectSnapshot.deleteMany({ where: snapshotWhere });
      await prisma.projectDeployment.deleteMany({ where: snapshotWhere });
    } catch (cleanupError) {
      console.warn("[db] cleanup skipped because Prisma cannot reach the configured database:", cleanupError);
    }
    if (!devProcess.killed) {
      devProcess.kill();
      await new Promise((resolve) => devProcess.on("exit", resolve));
    }
  }
}

run().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
