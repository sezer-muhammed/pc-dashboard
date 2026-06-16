"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2, Save, X } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  downloadFile,
  fetchFileContent,
  fetchRawObjectUrl,
  saveFile,
} from "@/lib/api";
import { humanBytes } from "@/lib/format";
import type { FileContent, FileEntry } from "@/types/files";

// CodeMirror only loads in the browser (no SSR) and only when a file is opened.
const CodeEditor = dynamic(
  () => import("@/components/files/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 font-mono text-[12px] text-[var(--ds-gray-700)]">Loading editor…</div>
    ),
  },
);

type Kind = "image" | "video" | "audio" | "text";

function kindOf(name: string): Kind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "mkv", "m4v", "ogv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac", "opus"].includes(ext)) return "audio";
  return "text";
}

export function FileViewer({
  entry,
  onClose,
  onSaved,
}: {
  entry: FileEntry | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [kind, setKind] = useState<Kind>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<FileContent | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    const k = kindOf(entry.name);
    setKind(k);
    setError(null);
    setContent(null);
    setDraft("");
    setDirty(false);
    setBlobUrl(null);
    setLoading(true);
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      try {
        if (k !== "text") {
          createdUrl = await fetchRawObjectUrl(entry.path);
          if (!cancelled) setBlobUrl(createdUrl);
        } else {
          const c = await fetchFileContent<FileContent>(entry.path);
          if (cancelled) return;
          setContent(c);
          if (c.text !== null) setDraft(c.text);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to open file.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [entry]);

  const editable = kind === "text" && content !== null && content.text !== null;

  const doSave = useCallback(async () => {
    if (!entry || !editable) return;
    setSaving(true);
    setError(null);
    try {
      await saveFile(entry.path, draft);
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      onSaved?.();
    } catch (e) {
      setError(e instanceof ApiError ? `Save failed (${e.message}).` : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [entry, editable, draft, onSaved]);

  const saveAndClose = useCallback(async () => {
    if (editable && dirty) await doSave();
    onClose();
  }, [editable, dirty, doSave, onClose]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void saveAndClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, saveAndClose, doSave]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => void saveAndClose()}
    >
      <Surface
        tone="raised"
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--ds-gray-alpha-400)] px-4 py-2.5">
          <span className="truncate font-medium text-[var(--ds-gray-1000)]">{entry.name}</span>
          {content ? <Badge tone="gray">{humanBytes(content.size)}</Badge> : null}
          {dirty ? <Badge tone="amber">unsaved</Badge> : justSaved ? <Badge tone="green">saved</Badge> : null}
          <div className="flex-1" />
          {editable ? (
            <>
              <Button
                size="sm"
                variant="primary"
                icon={saving ? Loader2 : Save}
                onClick={() => void doSave()}
                disabled={saving || !dirty}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadFile(entry.path, entry.name)}>
            Download
          </Button>
          <button
            type="button"
            onClick={() => void saveAndClose()}
            aria-label="Close (saves changes)"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-[var(--ds-background-200)]">
          {loading ? (
            <Centered>Loading…</Centered>
          ) : error ? (
            <Centered className="text-[var(--ds-red-900)]">{error}</Centered>
          ) : kind === "image" && blobUrl ? (
            <div className="flex h-full w-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={blobUrl} alt={entry.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : kind === "video" && blobUrl ? (
            <div className="flex h-full w-full items-center justify-center p-4">
              <video src={blobUrl} controls className="max-h-full max-w-full" />
            </div>
          ) : kind === "audio" && blobUrl ? (
            <div className="flex h-full w-full items-center justify-center p-6">
              <audio src={blobUrl} controls />
            </div>
          ) : editable ? (
            <div className="h-full w-full overflow-hidden">
              <CodeEditor
                value={draft}
                onChange={(v) => {
                  setDraft(v);
                  setDirty(true);
                }}
                filename={entry.name}
              />
            </div>
          ) : content && content.text === null ? (
            <Centered>
              <span className="mb-3 block">
                {content.reason === "too_large"
                  ? "File is too large to edit inline."
                  : "Binary file — no inline preview."}
              </span>
              <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadFile(entry.path, entry.name)}>
                Download instead
              </Button>
            </Centered>
          ) : null}
        </div>

        {editable ? (
          <div className="border-t border-[var(--ds-gray-alpha-400)] px-4 py-1.5 font-mono text-[11px] text-[var(--ds-gray-700)]">
            Edits auto-save on close · ⌘/Ctrl+S to save · Esc to save &amp; close · Cancel to discard
          </div>
        ) : null}
      </Surface>
    </div>
  );
}

function Centered({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center p-6 text-center text-[13px] text-[var(--ds-gray-900)] ${className ?? ""}`}>
      {children}
    </div>
  );
}
