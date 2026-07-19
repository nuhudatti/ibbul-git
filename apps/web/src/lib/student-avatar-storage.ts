import fs from "fs";
import path from "path";
import { matricToSlug, normalizeMatric } from "@/lib/matric";

function avatarFileKey(matric: string) {
  return matricToSlug(matric);
}

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function ensureAvatarDir() {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

export function extForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "jpg";
}

/** Public URL for avatar if file exists on disk */
export function getAvatarPublicUrl(matric: string): string | undefined {
  const key = avatarFileKey(matric);
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const filePath = path.join(AVATAR_DIR, `${key}.${ext}`);
    if (fs.existsSync(filePath)) {
      const useExt = ext === "jpeg" ? "jpg" : ext;
      return `/uploads/avatars/${key}.${useExt}`;
    }
  }
  return undefined;
}

export function saveAvatarFile(matric: string, mime: string, buffer: Buffer): string {
  ensureAvatarDir();
  const key = avatarFileKey(matric);
  const ext = extForMime(mime);

  for (const old of ["jpg", "jpeg", "png", "webp"]) {
    const oldPath = path.join(AVATAR_DIR, `${key}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const filePath = path.join(AVATAR_DIR, `${key}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/avatars/${key}.${ext}`;
}

export function deleteAvatarFile(matric: string) {
  const key = avatarFileKey(matric);
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const filePath = path.join(AVATAR_DIR, `${key}.${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

export function readAvatarFile(matric: string): { mime: string; buffer: Buffer } | null {
  const key = avatarFileKey(matric);
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const filePath = path.join(AVATAR_DIR, `${key}.${ext}`);
    if (fs.existsSync(filePath)) {
      const useExt = ext === "jpeg" ? "jpg" : ext;
      return {
        mime: MIME_BY_EXT[useExt] ?? "image/jpeg",
        buffer: fs.readFileSync(filePath),
      };
    }
  }
  return null;
}
