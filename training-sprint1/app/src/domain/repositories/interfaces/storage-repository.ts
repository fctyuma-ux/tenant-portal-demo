export interface IStorageRepository {
  upload(path: string, file: File | Blob): Promise<void>;
  download(path: string): Promise<Blob>;
  remove(paths: string[]): Promise<void>;
}
