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
// On mobile: automatically downloads to device's downloads folder
// On desktop: may show save dialog depending on browser
export async function saveBlobToDevice(
  blob: Blob,
  suggestedName: string,
  mimeType?: string
): Promise<"fs" | "share" | "download"> {
  const type = mimeType || blob.type || "application/octet-stream";
  const ext = suggestedName.includes(".")
    ? suggestedName.slice(suggestedName.lastIndexOf(".")).toLowerCase()
    : "";

  const isMobile = isMobileDevice();

  // On mobile, skip the file picker dialog and go straight to download
  if (isMobile) {
    // Try direct download first on mobile (saves to Downloads folder)
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return "download";
  }

  // Desktop: Try native file save (Chrome/Edge supports this)
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
    console.warn("showSaveFilePicker failed, will try download fallback", e);
  }

  // Fallback to classic download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "download";
}

