/** Holds a File picked on the landing page so the dashboard can process it. */
let pending: File | null = null;

export function stashFile(file: File) {
  pending = file;
}

export function takePendingFile(): File | null {
  const f = pending;
  pending = null;
  return f;
}
