"use client";

import { useEffect, useMemo, useState } from "react";
import type { PortfolioArtifact, StudentPortfolioProfile } from "@/types";
import { resolveAvatarUrl } from "@/lib/utils";
import { formatProofHash } from "@/lib/portfolio-hash";
import {
  buildVerifyUrl,
  collectSignatories,
  formatCredentialId,
  generateCredentialSeal,
  generatePlatformSignature,
  type CredentialSignatory,
} from "@/lib/credential";
import { CredentialQr } from "./credential-qr";

interface PortfolioPrintDocumentProps {
  profile: StudentPortfolioProfile;
  artifacts: PortfolioArtifact[];
  publicUrl: string;
  origin: string;
}

const MAX_PRINT_PROJECTS = 5;
const MAX_PRINT_SKILLS = 10;

function collectSkills(artifacts: PortfolioArtifact[]) {
  const counts = new Map<string, number>();
  artifacts.forEach((a) => {
    a.skills.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PRINT_SKILLS);
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PortfolioPrintDocument({
  profile,
  artifacts,
  publicUrl,
  origin,
}: PortfolioPrintDocumentProps) {
  const skills = collectSkills(artifacts);
  const [seal, setSeal] = useState("");
  const [platformSignature, setPlatformSignature] = useState("");
  const [signatories, setSignatories] = useState<CredentialSignatory[]>([]);
  const [issuedAt, setIssuedAt] = useState("");

  const generated = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const verifiedItems = artifacts.filter((a) => a.verified);
      const latestVerified = verifiedItems
        .map((a) => a.verifiedAt)
        .filter(Boolean)
        .sort()
        .reverse()[0];
      const issued =
        latestVerified ?? artifacts[0]?.submittedAt ?? new Date().toISOString();
      const s = await generateCredentialSeal(profile.matric, artifacts);
      const sig = await generatePlatformSignature(profile.matric, artifacts, issued);
      const signs = collectSignatories(profile, artifacts, sig);
      if (!cancelled) {
        setSeal(s);
        setPlatformSignature(sig);
        setSignatories(signs);
        setIssuedAt(issued);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, artifacts]);

  const verified = artifacts.filter((a) => a.verified);
  const verifyUrl = seal ? buildVerifyUrl(origin, profile.matric, seal) : "";
  const credentialId = seal ? formatCredentialId(seal) : "ULA-CERT-····";
  const displayProjects = artifacts.slice(0, MAX_PRINT_PROJECTS);
  const extraProjects = artifacts.length - displayProjects.length;

  const liveDeployUrls = useMemo(() => {
    const unique = Array.from(new Set(artifacts.map((a) => a.deployUrl).filter(Boolean)));
    return unique.map((u) =>
      u && (u.startsWith("http://") || u.startsWith("https://"))
        ? u
        : `${origin.replace(/\/+$/, "")}${u}`
    );
  }, [artifacts, origin]);

  const stats = [
    { label: "Verified", value: String(profile.verifiedCount) },
    { label: "Projects", value: String(profile.totalArtifacts) },
    { label: "Live deploys", value: String(profile.liveDeploys) },
    {
      label: "Average score",
      value: profile.avgScore != null ? `${profile.avgScore}%` : "—",
    },
  ];

  return (
    <div className="ula-print-document" aria-hidden="true">
      <div className="ula-print-sheet">
        <div className="ula-print-frame-outer">
          <div className="ula-print-frame-inner">
            <div className="ula-print-watermark" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i}>IBBUL ULA</span>
              ))}
            </div>

            <div className="ula-print-layout">
              {/* ── Header band ── */}
              <header className="ula-print-zone ula-print-zone-header">
                <div className="ula-print-ornament">✦</div>
                <div className="ula-print-header-center">
                  <p className="ula-print-est">Project ULA · Unified Learning Architecture</p>
                  <h1 className="ula-print-brand">IBBUL ULA</h1>
                  <p className="ula-print-cert-title">Certificate of Verified Proof-of-Work</p>
                </div>
                <div className="ula-print-header-side">
                  <span className="ula-print-meta-label">Credential ID</span>
                  <span className="ula-print-meta-value">{credentialId}</span>
                  <span className="ula-print-meta-label">Date of issue</span>
                  <span className="ula-print-meta-value">
                    {issuedAt ? formatDateShort(issuedAt) : generated}
                  </span>
                </div>
              </header>

              <div className="ula-print-rule" />

              {/* ── Recipient (centered diploma block) ── */}
              <section className="ula-print-zone ula-print-zone-recipient">
                <p className="ula-print-presents">This credential is proudly presented to</p>
                {(() => {
                  const resolvedAvatarUrl = resolveAvatarUrl(profile.avatarUrl);
                  if (resolvedAvatarUrl) {
                    return (
                      <img
                        src={`${resolvedAvatarUrl}${profile.updatedAt ? `?v=${encodeURIComponent(profile.updatedAt)}` : ""}`}
                        alt={profile.displayName}
                        className="ula-print-photo"
                        crossOrigin="anonymous"
                      />
                    );
                  }

                  return (
                    <div
                      className="ula-print-photo flex items-center justify-center text-white"
                      style={{ backgroundColor: "#0f172a" }}
                      aria-hidden="true"
                    >
                      {profile.avatar}
                    </div>
                  );
                })()}
                <h2 className="ula-print-name">{profile.displayName}</h2>
                <p className="ula-print-matric">{profile.matric}</p>
                <p className="ula-print-program">
                  {profile.program} · {profile.institution}
                </p>
                <div className="ula-print-stats">
                  {stats.map((s) => (
                    <div key={s.label} className="ula-print-stat-pill">
                      <span className="ula-print-stat-val">{s.value}</span>
                      <span className="ula-print-stat-lbl">{s.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="ula-print-rule ula-print-rule-thin" />

              {/* ── Main body (fills vertical space) ── */}
              <main className="ula-print-zone ula-print-zone-main">
                <div className="ula-print-panel ula-print-panel-portfolio">
                  <div className="ula-print-panel-head">
                    <span className="ula-print-panel-num">I</span>
                    <h3>Verified portfolio record</h3>
                  </div>
                  <div className="ula-print-panel-body">
                    {displayProjects.length === 0 ? (
                      <p className="ula-print-empty">No artifacts on record.</p>
                    ) : (
                      <table className="ula-print-table">
                        <thead>
                          <tr>
                            <th>Project</th>
                            <th>Score</th>
                            <th>Proof-of-work ID</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayProjects.map((a) => (
                            <tr
                              key={a.id}
                              className={a.verified ? "ula-print-row-verified" : ""}
                            >
                              <td>
                                <span className="ula-print-td-title">{a.title}</span>
                                <span className="ula-print-td-sub">{a.courseName}</span>
                              </td>
                              <td className="ula-print-td-score">
                                {a.score != null ? `${a.score}/${a.maxScore}` : "—"}
                              </td>
                              <td className="ula-print-td-mono">{formatProofHash(a.hash)}</td>
                              <td className="ula-print-td-status">
                                {a.verified ? "Verified" : "Pending"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {extraProjects > 0 ? (
                      <p className="ula-print-footnote">
                        +{extraProjects} additional project{extraProjects > 1 ? "s" : ""} on the
                        live digital portfolio.
                      </p>
                    ) : null}
                    <p className="ula-print-panel-note">
                      Each entry was built in the ULA workspace, cryptographically sealed, and
                      faculty-verified on-platform.
                    </p>
                  </div>
                </div>

                <div className="ula-print-panel-stack">
                  <div className="ula-print-panel ula-print-panel-auth">
                    <div className="ula-print-panel-head">
                      <span className="ula-print-panel-num">II</span>
                      <h3>Authentication & verification</h3>
                    </div>
                    <div className="ula-print-panel-body ula-print-auth-body">
                      <div className="ula-print-qr-box">
                        {verifyUrl ? <CredentialQr url={verifyUrl} size={76} /> : null}
                        <div>
                          <p className="ula-print-qr-title">Scan to verify worldwide</p>
                          <p className="ula-print-qr-url">{verifyUrl}</p>
                        </div>
                      </div>
                      <p className="ula-print-auth-copy">
                        Issued exclusively by <strong>IBBUL ULA</strong>. Cryptographically bound —
                        cannot be forged, reissued, or altered outside the platform.
                      </p>
                      <dl className="ula-print-auth-dl">
                        <div>
                          <dt>Platform signature</dt>
                          <dd className="ula-print-mono">{platformSignature || "—"}</dd>
                        </div>
                        <div>
                          <dt>Verification status</dt>
                          <dd>
                            {verified.length} of {artifacts.length} artifacts verified
                          </dd>
                        </div>
                        <div>
                          <dt>Live portfolio</dt>
                          <dd className="ula-print-mono ula-print-url">{publicUrl}</dd>
                        </div>
                        <div>
                          <dt>Live deployments</dt>
                          <dd className="ula-print-mono ula-print-url">
                            {liveDeployUrls.length > 0 ? (
                              liveDeployUrls.map((u, i) => (
                                <span key={u}>
                                  {u}
                                  {i < liveDeployUrls.length - 1 ? " · " : ""}
                                </span>
                              ))
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="ula-print-panel ula-print-panel-skills">
                    <div className="ula-print-panel-head">
                      <span className="ula-print-panel-num">III</span>
                      <h3>Technical competencies</h3>
                    </div>
                    <div className="ula-print-panel-body">
                      {skills.length > 0 ? (
                        <ul className="ula-print-skill-chips">
                          {skills.map(([skill, count]) => (
                            <li key={skill}>
                              {skill}
                              <span className="ula-print-chip-count">{count}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ula-print-empty">Demonstrated through coursework.</p>
                      )}
                      <div className="ula-print-seal-stamp">
                        <span className="ula-print-seal-icon">◆</span>
                        <div>
                          <p className="ula-print-seal-label">Institutional seal</p>
                          <p className="ula-print-seal-text">
                            Platform-bound · Non-transferable · Registry-verified
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>

              <div className="ula-print-rule" />

              {/* ── Signatures ── */}
              <section className="ula-print-zone ula-print-zone-sigs">
                <p className="ula-print-sigs-title">Authorized signatures</p>
                <div className="ula-print-sigs-row">
                  {signatories.slice(0, 3).map((s, i) => (
                    <div key={`${s.role}-${i}`} className="ula-print-sig-cell">
                      <p className="ula-print-sig-role">
                        {s.role === "platform"
                          ? "Platform authority"
                          : s.role === "faculty"
                            ? "Department verifier"
                            : "Credential holder"}
                      </p>
                      <div className="ula-print-sig-line" />
                      <p className="ula-print-sig-name">{s.name}</p>
                      {s.signatureCode ? (
                        <p className="ula-print-sig-code ula-print-mono">{s.signatureCode}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Footer ── */}
              <footer className="ula-print-zone ula-print-zone-footer">
                <p className="ula-print-micro">
                  IBBUL ULA · VPE · AUTHENTIC · NON-TRANSFERABLE · SCAN TO VERIFY · {credentialId}
                </p>
                <p className="ula-print-legal">
                  © Project ULA (IBBUL ULA). Reproduction prohibited without platform authorization.
                  Document generated {generated}.
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
