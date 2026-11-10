import { base44 } from "@/api/base44Client";

export const callImport = (payload) =>
  base44.functions.invoke("migration-import", payload).then((r) => r.data);

export async function uploadMigrationFile(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}