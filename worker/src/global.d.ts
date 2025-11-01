interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type R2PutValue =
  | ArrayBuffer
  | ArrayBufferView
  | ReadableStream
  | ReadableStreamDefaultReader
  | string
  | null;

type R2Conditional = {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: string | Date;
  uploadedAfter?: string | Date;
};

type R2HttpMetadata = {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: number | Date;
};

type R2PutOptions = {
  onlyIf?: R2Conditional;
  httpMetadata?: R2HttpMetadata;
};

type R2GetOptions = {
  onlyIf?: R2Conditional;
  range?: {
    offset?: number;
    length?: number;
  };
};

interface R2ObjectBody {
  body: ReadableStream<Uint8Array> | null;
  httpMetadata?: R2HttpMetadata;
  size: number;
  etag?: string;
  uploaded?: Date;
}

interface R2Object extends R2ObjectBody {}

interface R2Bucket {
  put(key: string, value: R2PutValue, options?: R2PutOptions): Promise<R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}
