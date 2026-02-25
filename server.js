const { createApp } = require("./app");

const PORT = Number(process.env.PORT || 3000);
const app = createApp();

if (typeof app.locals.ensureStoreFile === "function") {
  app.locals.ensureStoreFile();
}

const runtime = app.locals.runtime || {};
const mode = runtime.useBlobStore
  ? `blob:${runtime.blobStorePath} (access:${runtime.blobAccess})`
  : `file:${runtime.storePath}`;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[invitation-platform-codex] listening on http://localhost:${PORT} (${mode})`);
});
