"use client";

import { useEffect, useMemo, useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { yaml } from "@codemirror/lang-yaml";
import { sql } from "@codemirror/lang-sql";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { xml } from "@codemirror/lang-xml";

function languageFor(name: string): Extension[] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "py":
    case "pyw":
      return [python()];
    case "js":
    case "mjs":
    case "cjs":
      return [javascript()];
    case "jsx":
      return [javascript({ jsx: true })];
    case "ts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ jsx: true, typescript: true })];
    case "json":
      return [json()];
    case "md":
    case "markdown":
      return [markdown()];
    case "html":
    case "htm":
      return [html()];
    case "css":
    case "scss":
    case "less":
      return [css()];
    case "yaml":
    case "yml":
      return [yaml()];
    case "sql":
      return [sql()];
    case "rs":
      return [rust()];
    case "c":
    case "h":
    case "cpp":
    case "cxx":
    case "cc":
    case "hpp":
      return [cpp()];
    case "go":
      return [go()];
    case "xml":
    case "svg":
      return [xml()];
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  filename,
}: {
  value: string;
  onChange: (v: string) => void;
  filename: string;
}) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const extensions = useMemo(
    () => [...languageFor(filename), keymap.of([indentWithTab])],
    [filename],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={dark ? vscodeDark : vscodeLight}
      extensions={extensions}
      height="100%"
      style={{ height: "100%", fontSize: "13px" }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        autocompletion: false,
        bracketMatching: true,
      }}
    />
  );
}
