export type FileEntry = {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  modified: string;
};

export type DirListing = {
  path: string;
  parent: string | null;
  entries: FileEntry[];
};

export type FileContent = {
  path: string;
  name: string;
  size: number;
  mime: string | null;
  text: string | null;
  reason?: "binary" | "too_large";
};
