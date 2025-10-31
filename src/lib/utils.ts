import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to detect mobile devices
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

// Cross-platform helper to save a Blob directly to device storage when possible
// Shows native file picker on supported browsers, falls back to download
export async function saveBlobToDevice(
  blob: Blob,
  suggestedName: string,
  mimeType?: string
): Promise<"fs" | "share" | "download"> {
  const type = mimeType || blob.type || "application/octet-stream";
  const ext = suggestedName.includes(".")
    ? suggestedName.slice(suggestedName.lastIndexOf(".")).toLowerCase()
    : "";

  // Try native file save picker first (shows "Save As" dialog)
  try {
    const w = window as any;
    if (typeof w.showSaveFilePicker === "function") {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: type,
            accept: {
              [type]: ext ? [ext] : [""],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "fs";
    }
  } catch (e) {
    console.warn("showSaveFilePicker failed or cancelled, using download fallback", e);
  }

  // Fallback to classic download
  const fileBlob = blob.type ? blob : new Blob([blob], { type });
  const url = URL.createObjectURL(fileBlob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = suggestedName;
  a.rel = "noopener";
  a.target = "_self";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "download";
}

