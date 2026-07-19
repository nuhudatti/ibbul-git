/** Generate readable temporary passwords for bulk provisioning */
export function generateTempPassword(length = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)];
  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export function buildCredentialsCsv(
  rows: {
    matric: string;
    fullName: string;
    program: string;
    tempPassword: string;
    status: string;
  }[],
  loginUrl: string
): string {
  const header =
    "Matric,Full Name,Program,Temporary Password,Status,Login URL,Instructions";
  const lines = rows.map((r) => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      esc(r.matric),
      esc(r.fullName),
      esc(r.program),
      esc(r.tempPassword),
      esc(r.status),
      esc(loginUrl),
      esc("Sign in with matric + temp password. You must set a new password on first login."),
    ].join(",");
  });
  return [header, ...lines].join("\r\n");
}

export function buildCredentialsTxt(
  rows: {
    matric: string;
    fullName: string;
    program: string;
    tempPassword: string;
  }[],
  loginUrl: string
): string {
  const divider = "═".repeat(52);
  return rows
    .map(
      (r) =>
        `${divider}\n` +
        `PROJECT ULA · STUDENT ACCESS CREDENTIALS\n` +
        `${divider}\n` +
        `Matric:      ${r.matric}\n` +
        `Name:        ${r.fullName}\n` +
        `Program:     ${r.program}\n` +
        `Password:    ${r.tempPassword}\n` +
        `Login:       ${loginUrl}\n` +
        `Note:        Change password immediately on first sign-in.\n`
    )
    .join("\n");
}
