import { v2 as cloudinary } from "cloudinary";

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function getCloudinaryConfig() {
  const CLOUDINARY_URL = normalizeEnvValue(process.env.CLOUDINARY_URL);
  const CLOUDINARY_CLOUD_NAME = normalizeEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
  const CLOUDINARY_API_KEY = normalizeEnvValue(process.env.CLOUDINARY_API_KEY);
  const CLOUDINARY_API_SECRET = normalizeEnvValue(process.env.CLOUDINARY_API_SECRET);

  if (CLOUDINARY_URL) {
    return {
      cloudinary_url: CLOUDINARY_URL,
      secure: true,
    };
  }

  return {
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  };
}

function ensureCloudinaryConfig() {
  const config = getCloudinaryConfig();
  const hasExplicitKeys = Boolean(config.cloud_name && config.api_key && config.api_secret);
  const hasUrl = Boolean((config as { cloudinary_url?: string }).cloudinary_url);

  if (!hasExplicitKeys && !hasUrl) {
    throw new Error(
      "Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or CLOUDINARY_URL in the server environment."
    );
  }

  cloudinary.config(config);
}

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width?: number;
  height?: number;
  bytes?: number;
  created_at?: string;
};

export async function uploadToCloudinary(buffer: Buffer, fileName: string, folder = "ula") {
  ensureCloudinaryConfig();

  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: fileName.replace(/\.[^.]+$/, ""),
        overwrite: true,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          secure_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          resource_type: uploaded.resource_type,
          format: uploaded.format,
          width: uploaded.width,
          height: uploaded.height,
          bytes: uploaded.bytes,
          created_at: uploaded.created_at,
        });
      }
    );

    stream.end(buffer);
  });

  return result;
}

export async function deleteCloudinaryAsset(publicId: string) {
  await cloudinary.uploader.destroy(publicId);
}
