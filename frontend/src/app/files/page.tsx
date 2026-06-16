"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Download,
  FileText,
  Folder,
  HardDrive,
  RotateCw,
  Upload,
} from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { RecordTable } from "@/components/ui/record-table";
import { Mono, EmptyRow } from "@/components/dashboard/panel";
import { ApiError, apiGet, downloadFile, uploadFiles } from "@/lib/api";
import { humanBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DirListing, FileEntry } from "@/types/files";

export default function FilesPage() {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const qs = p ? `?path=${encodeURIComponent(p)}` : "";
      const data = await apiGet<DirListing>(`/files/list/${qs}`);
      setListing(data);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 404
            ? "Path not found."
            : e.status === 400
              ? "Cannot open this path."
              : e.message
          : "Failed to load directory.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  const cwd = listing?.path ?? "";

  const doUpload = useCallback(
    async (files: File[]) => {
      if (!files.length || !listing) return;
      setBusy(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`);
      setError(null);
      try {
        await uploadFiles(listing.path, files);
        await load(listing.path);
      } catch (e) {
        setError(e instanceof ApiError ? `Upload failed (${e.message}).` : "Upload failed.");
      } finally {
        setBusy(null);
      }
    },
    [listing, load],
  );

  async function onDownload(entry: FileEntry) {
    try {
      await downloadFile(entry.path, entry.name);
    } catch (e) {
      setError(e instanceof ApiError ? `Download failed (${e.message}).` : "Download failed.");
    }
  }

  // Breadcrumb: cumulative absolute paths.
  const parts = cwd.split("/").filter(Boolean);
  const crumbs = parts.map((name, i) => ({ name, path: "/" + parts.slice(0, i + 1).join("/") }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
            transfer
          </p>
          <h1 className="flex items-center gap-2 text-[24px] font-semibold leading-7 text-[var(--ds-gray-1000)]">
            <HardDrive className="h-5 w-5" aria-hidden /> Files
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
            Upload
          </Button>
          <button
            type="button"
            onClick={() => load(cwd || null)}
            aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
          >
            <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void doUpload(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Surface
        tone="raised"
        className={cn("overflow-hidden", dragOver && "ring-2 ring-[var(--ds-blue-700)]")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void doUpload(Array.from(e.dataTransfer.files));
        }}
      >
        {/* Breadcrumb + up */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--ds-gray-alpha-400)] px-3 py-2 text-[13px]">
          <button
            type="button"
            onClick={() => listing?.parent && load(listing.parent)}
            disabled={!listing?.parent}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)] disabled:opacity-40"
            aria-label="Up"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => load("/")}
            className="rounded-[5px] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]"
          >
            /
          </button>
          {crumbs.map((c) => (
            <span key={c.path} className="flex items-center">
              <button
                type="button"
                onClick={() => load(c.path)}
                className="rounded-[5px] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]"
              >
                {c.name}
              </button>
              <span className="text-[var(--ds-gray-500)]">/</span>
            </span>
          ))}
        </div>

        {error ? (
          <div className="border-b border-[var(--ds-gray-alpha-300)] bg-[color-mix(in_srgb,var(--ds-red-100)_60%,var(--ds-background-100))] px-4 py-2 text-[12px] text-[var(--ds-red-900)]">
            {error}
          </div>
        ) : null}
        {busy ? (
          <div className="border-b border-[var(--ds-gray-alpha-300)] bg-[var(--ds-gray-100)] px-4 py-2 text-[12px] text-[var(--ds-gray-900)]">
            {busy}
          </div>
        ) : null}

        {listing && listing.entries.length === 0 && !loading ? (
          <EmptyRow>Empty folder. Drag files here or use Upload.</EmptyRow>
        ) : (
          <RecordTable
            getRowId={(e: FileEntry) => e.path}
            rows={listing?.entries ?? []}
            minWidth={620}
            onRowClick={(e) => (e.is_dir ? load(e.path) : undefined)}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (e) => (
                  <span className="flex items-center gap-2">
                    {e.is_dir ? (
                      <Folder className="h-4 w-4 text-[var(--ds-blue-700)]" aria-hidden />
                    ) : (
                      <FileText className="h-4 w-4 text-[var(--ds-gray-600)]" aria-hidden />
                    )}
                    <span className={e.is_dir ? "font-medium text-[var(--ds-gray-1000)]" : "text-[var(--ds-gray-900)]"}>
                      {e.name}
                    </span>
                  </span>
                ),
              },
              {
                key: "size",
                header: "Size",
                align: "right",
                render: (e) => <Mono>{e.is_dir ? "—" : humanBytes(e.size)}</Mono>,
              },
              {
                key: "modified",
                header: "Modified",
                align: "right",
                render: (e) => <Mono>{new Date(e.modified).toLocaleString()}</Mono>,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (e) =>
                  e.is_dir ? null : (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void onDownload(e);
                      }}
                      className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2 text-[12px] font-medium text-[var(--ds-gray-1000)] transition hover:bg-[var(--ds-gray-100)]"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden /> Download
                    </button>
                  ),
              },
            ]}
          />
        )}
      </Surface>
      <p className="text-[12px] text-[var(--ds-gray-700)]">
        Tip: click a folder to open it, drag files onto the panel to upload to the current folder.
      </p>
    </div>
  );
}
