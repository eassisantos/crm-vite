/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WORKER_UPLOAD_LIMIT_MB?: string;
  readonly VITE_DISABLE_AI?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
