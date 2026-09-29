import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER?.trim() || "profile-photos";

export function isAzureBlobConfigured() {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim() || process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim());
}

export function profileBlobName(uid: string) {
  return `profiles/${uid}/avatar`;
}

function serviceClient() {
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (connection) return BlobServiceClient.fromConnectionString(connection);
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  if (!account) throw new Error("Azure Storage is not configured.");
  return new BlobServiceClient(`https://${account}.blob.core.windows.net`, new DefaultAzureCredential());
}

function containerClient() {
  return serviceClient().getContainerClient(CONTAINER);
}

export async function uploadProfilePhoto(uid: string, data: Buffer, contentType: string) {
  const container = containerClient();
  await container.createIfNotExists();
  const blob = container.getBlockBlobClient(profileBlobName(uid));
  await blob.uploadData(data, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobCacheControl: "public, max-age=3600",
    },
  });
  return profileBlobName(uid);
}

export async function deleteProfilePhoto(uid: string) {
  if (!isAzureBlobConfigured()) return;
  const blob = containerClient().getBlockBlobClient(profileBlobName(uid));
  await blob.deleteIfExists({ deleteSnapshots: "include" });
}

export async function readProfilePhoto(uid: string) {
  const blob = containerClient().getBlockBlobClient(profileBlobName(uid));
  if (!(await blob.exists())) return null;
  const [buffer, props] = await Promise.all([blob.downloadToBuffer(), blob.getProperties()]);
  return { buffer, contentType: props.contentType || "application/octet-stream" };
}
