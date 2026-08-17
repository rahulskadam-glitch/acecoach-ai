/**
 * True when a storage path could only belong to this user's own directory
 * tree, with no path-traversal or path-separator-escape sequences. Shared
 * base check for every place that reads a `storage_path` out of the
 * database before touching Supabase Storage with it.
 */
export function isOwnedStoragePath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..") && !path.includes("\\");
}

export function assertOwnedStoragePath(path: string, userId: string, message = "The stored path failed its ownership check."): void {
  if (!isOwnedStoragePath(path, userId)) throw new Error(message);
}
