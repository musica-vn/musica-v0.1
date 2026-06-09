export const COMPLIANCE_MAX_FILES = 10;
export const COMPLIANCE_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const COMPLIANCE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'application/msword',
  'application/vnd.ms-word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

export type ComplianceAllowedMimeType =
  (typeof COMPLIANCE_ALLOWED_MIME_TYPES)[number];
