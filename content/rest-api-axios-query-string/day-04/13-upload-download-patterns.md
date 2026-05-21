# 13 — Upload & Download Patterns

---

## T — TL;DR

Axios has built-in `onUploadProgress` and `onDownloadProgress` callbacks. File uploads use `FormData`. File downloads use `responseType: 'blob'`. Both need proper progress tracking and error handling.

---

## K — Key Concepts

### File Upload with `FormData`

```js
async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", file.name);
  // Do NOT manually set Content-Type — browser adds boundary automatically

  const { data } = await api.post("/upload", formData, {
    onUploadProgress: (progressEvent) => {
      const { loaded, total } = progressEvent;
      if (total) {
        const percent = Math.round((loaded * 100) / total);
        onProgress(percent);
      }
    },
  });

  return data; // { fileId: '...', url: '...' }
}
```

### Upload Progress in a React Component

```jsx
function FileUploader() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const data = await uploadFile(file, setProgress);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress}%</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {result && <p>Uploaded: {result.url}</p>}
    </div>
  );
}
```

### Multiple File Upload

```js
async function uploadFiles(files, onProgress) {
  const formData = new FormData();
  Array.from(files).forEach((file, i) => {
    formData.append(`files[${i}]`, file);
  });

  const { data } = await api.post("/upload/batch", formData, {
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded / e.total) * 100);
      onProgress(percent);
    },
  });
  return data;
}
```

### File Download — `responseType: 'blob'`

```js
async function downloadFile(fileId, filename) {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob", // ← tell Axios to treat response as binary
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        console.log(`Download: ${percent}%`);
      }
    },
  });

  // Create a temporary download link
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // ← cleanup memory
}
```

### Download with Filename from Content-Disposition Header

```js
async function downloadFileAuto(fileId) {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers["content-disposition"];
  let filename = "download";

  if (contentDisposition) {
    const match = contentDisposition.match(
      /filename[^;=\n]*=(['"]*)(.*?)\1[;\n]?$/
    );
    if (match?.[2]) filename = decodeURIComponent(match[2]);
  }

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Upload with Cancellation

```js
async function uploadWithCancel(file, onProgress) {
  const controller = new AbortController();

  const uploadPromise = api.post("/upload", createFormData(file), {
    signal: controller.signal,
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded / e.total) * 100);
      onProgress(percent);
    },
  });

  return { uploadPromise, cancel: () => controller.abort() };
}

// Usage
const { uploadPromise, cancel } = await uploadWithCancel(file, setProgress);
setCancelFn(() => cancel); // expose cancel to UI
const result = await uploadPromise;
```

---

## W — Why It Matters

- File upload with progress bars is a ubiquitous feature — every admin panel, profile editor, or document manager needs it.
- Not revoking `URL.createObjectURL` after a download is a memory leak — browsers hold the blob in memory until the URL is revoked.
- Getting the filename from `Content-Disposition` is required for dynamically named files (e.g., `report-2026-05-19.pdf`).
- Cancellable uploads improve UX significantly for large files — users need an "X" button to stop.

---

## I — Interview Q&A

### Q1: How do you track upload progress in Axios?

**A:** Use the `onUploadProgress` callback in the request config. It receives a `ProgressEvent` with `loaded` (bytes uploaded so far) and `total` (total bytes). Calculate `Math.round((loaded / total) * 100)` for the percentage.

### Q2: Why shouldn't you manually set `Content-Type: multipart/form-data` when uploading with `FormData`?

**A:** The browser automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`. The boundary is a unique string that separates form fields in the body. If you override the header manually, you overwrite the boundary and the server can't parse the form data.

### Q3: How do you trigger a file download from an Axios response?

**A:** Set `responseType: 'blob'`, then create an object URL with `URL.createObjectURL(response.data)`, create a hidden `<a>` element, set its `href` and `download` attribute, click it programmatically, then revoke the URL with `URL.revokeObjectURL()` to prevent memory leaks.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Manually setting `Content-Type` for `FormData`

```js
api.post("/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }, // ← removes boundary!
});
// Server: cannot parse multipart body — boundary missing
```

**Fix:** Remove the header. Let the browser set it with the boundary automatically.

### ❌ Pitfall: Not revoking the object URL after download

```js
const url = URL.createObjectURL(blob);
link.click();
// ← No revokeObjectURL → blob stays in memory for the lifetime of the page
```

**Fix:**

```js
const url = URL.createObjectURL(blob);
link.click();
URL.revokeObjectURL(url); // ✅ immediate cleanup is fine — download already started
```

### ❌ Pitfall: Calling `.json()` or accessing `.data` as JSON on a blob response

```js
const { data } = await api.get("/export", { responseType: "blob" });
console.log(data.filename); // undefined — data is a Blob, not parsed JSON
```

**Fix:** When `responseType: 'blob'` is set, `data` is a Blob. Use `URL.createObjectURL(data)` for downloads. If you need both JSON metadata and a file, use separate requests.

---

## K — Coding Challenge + Solution

### Challenge

Write `uploadAvatar(userId, file, onProgress)` that:

1. Sends the file as `FormData`
2. Tracks upload progress
3. Allows cancellation — returns a `{ promise, cancel }` object
4. Returns the new avatar URL on success

```js
const { promise, cancel } = uploadAvatar(42, file, setProgress);
// User clicks cancel:
cancel();
// Or await result:
const { avatarUrl } = await promise;
```

### Solution

```js
import api from "@/lib/api";
import axios from "axios";

function uploadAvatar(userId, file, onProgress) {
  const controller = new AbortController();

  const promise = (async () => {
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", String(userId));
    // No Content-Type override — browser sets multipart boundary

    try {
      const { data } = await api.post(`/users/${userId}/avatar`, formData, {
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.total) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        },
      });
      return data; // { avatarUrl: 'https://...' }
    } catch (err) {
      if (axios.isCancel(err)) return null; // cancelled by user
      throw err; // real error — propagate
    }
  })();

  return {
    promise,
    cancel: () => controller.abort(),
  };
}
```

---

---
