export function extractAdminPassword(request: Request, bodyPassword?: string): string {
  const headerPassword = request.headers.get('x-admin-password');
  if (headerPassword && headerPassword.trim()) {
    return headerPassword.trim();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return token;
    }
  }

  if (typeof bodyPassword === 'string' && bodyPassword.trim()) {
    return bodyPassword.trim();
  }

  try {
    const url = new URL(request.url);
    const queryPassword = url.searchParams.get('password');
    if (queryPassword && queryPassword.trim()) {
      return queryPassword.trim();
    }
  } catch {
    // ignore invalid URL
  }

  return '';
}

export async function verifyAdminPassword(
  provided: string | null | undefined,
  expected: string | null | undefined
): Promise<boolean> {
  if (!expected || !expected.trim()) {
    return false;
  }
  if (!provided || !provided.trim()) {
    return false;
  }

  const encoder = new TextEncoder();
  const providedBytes = encoder.encode(provided.trim());
  const expectedBytes = encoder.encode(expected.trim());

  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', providedBytes),
    crypto.subtle.digest('SHA-256', expectedBytes)
  ]);

  const subtleWithTiming = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
  };

  if (typeof subtleWithTiming.timingSafeEqual === 'function') {
    return subtleWithTiming.timingSafeEqual(providedHash, expectedHash);
  }

  const a = new Uint8Array(providedHash);
  const b = new Uint8Array(expectedHash);
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
