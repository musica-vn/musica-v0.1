import {
  COMPLIANCE_ALLOWED_MIME_TYPES,
  type ComplianceAllowedMimeType,
} from './compliance-upload.constants';

export type ResolvedLegalFileMimeType = {
  resolvedMimeType: ComplianceAllowedMimeType;
  extension: string | null;
};

export const normalizeMimeType = (mimeType: string): string =>
  mimeType.split(';')[0]?.trim().toLowerCase() ?? '';

export const getFileExtension = (fileName: string): string | null => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  const extension = fileName.slice(dotIndex + 1).trim().toLowerCase();
  return extension.length > 0 ? extension : null;
};

export const inferMimeTypeFromExtension = (
  extension: string | null,
): ComplianceAllowedMimeType | null => {
  if (!extension) return null;
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === 'doc') return 'application/msword';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return null;
};

export const resolveLegalFileMimeType = (params: {
  mimeType: string;
  fileName: string;
}): ResolvedLegalFileMimeType | null => {
  const normalized = normalizeMimeType(params.mimeType);
  const extension = getFileExtension(params.fileName);

  if (
    COMPLIANCE_ALLOWED_MIME_TYPES.includes(
      normalized as ComplianceAllowedMimeType,
    )
  ) {
    return {
      resolvedMimeType: normalized as ComplianceAllowedMimeType,
      extension,
    };
  }

  if (normalized !== 'application/octet-stream') return null;
  const inferred = inferMimeTypeFromExtension(extension);
  if (!inferred) return null;

  return { resolvedMimeType: inferred, extension };
};

export const slugifyFileName = (value: string): string => {
  const safeInput = value
    .trim()
    .replaceAll('\\', '-')
    .replaceAll('/', '-')
    .replaceAll('..', '.');
  const dotIndex = safeInput.lastIndexOf('.');
  const base = dotIndex > 0 ? safeInput.slice(0, dotIndex) : safeInput;
  const extensionRaw = dotIndex > 0 ? safeInput.slice(dotIndex + 1) : '';

  const baseSlug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^\.+|\.+$/g, '')
    .replaceAll(/^-+|-+$/g, '');

  const extensionSlug = extensionRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  if (extensionSlug.length === 0) return baseSlug.length > 0 ? baseSlug : 'file';
  return `${baseSlug.length > 0 ? baseSlug : 'file'}.${extensionSlug}`;
};
