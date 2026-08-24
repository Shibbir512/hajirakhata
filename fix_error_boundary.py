import re

with open('App.tsx', 'r') as f:
    content = f.read()

pattern = r'''  componentDidCatch\(error: any, errorInfo: any\) \{
    console\.error\("ErrorBoundary caught an error", error, errorInfo\);
  \}'''

replacement = r'''  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // Handle chunk loading errors (e.g. "Failed to fetch dynamically imported module")
    const isChunkLoadFailed = error?.message?.match(/Failed to fetch dynamically imported module/i);
    if (isChunkLoadFailed) {
      const chunkFailedMessage = "ChunkLoadError";
      const hasReloaded = sessionStorage.getItem(chunkFailedMessage);
      if (!hasReloaded) {
        sessionStorage.setItem(chunkFailedMessage, 'true');
        window.location.reload();
      }
    }
  }'''

content = re.sub(pattern, replacement, content)

with open('App.tsx', 'w') as f:
    f.write(content)
print("done")
