// Minimal typings for the File System Access API (Chromium browsers).
interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

interface Window {
  showSaveFilePicker?: (options?: { suggestedName?: string; types?: FilePickerAcceptType[] }) => Promise<FileSystemFileHandle>
  showOpenFilePicker?: (options?: { types?: FilePickerAcceptType[]; multiple?: boolean }) => Promise<FileSystemFileHandle[]>
}

interface FileSystemHandle {
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}
