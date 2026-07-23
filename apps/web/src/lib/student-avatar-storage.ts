import fs from "fs";
import path from "path";
import { matricToSlug, normalizeMatric } from "@/lib/matric";

function avatarFileKey(matric: string) {
  return matricToSlug(matric);
}

// Use /tmp on production (Vercel), public dir on local
const AVATAR_DIR = process.env.NODE_ENV === "production" 
  ? path.join("/tmp", "avatars")
  : path.join(process.cwd(), "public", "uploads", "avatars");

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
      // On production, avatars are in /tmp (session-local), so return data URL or temp endpoint
      if (process.env.NODE_ENV === "production") {
        // Return placeholder since /tmp is not web-accessible on Vercel
        // In production, consider using cloud storage (S3, Vercel Blob, etc.)
        return undefined;
      }
      return `/uploads/avatars/${key}.${useExt}`;
    }
  }
  return undefined;
}

export function saveAvatarFile(matric: string, mime: string, buffer: Buffer): string {
  // In production serverless environments, the public directory is not writable
  // and /tmp is not web-accessible. Return a data URL so the avatar can be
  // rendered directly from the profile record. In development, write to
  // public/uploads/avatars so the file is served normally.
  const key = avatarFileKey(matric);
  const ext = extForMime(mime);

  if (process.env.NODE_ENV === "production") {
    // option: still write to /tmp for ephemeral storage, but return a data URL
    try {
      ensureAvatarDir();
      const filePath = path.join(AVATAR_DIR, `${key}.${ext}`);
      fs.writeFileSync(filePath, buffer);
    } catch (e) {
      // ignore write failures in production
    }
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  ensureAvatarDir();
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
