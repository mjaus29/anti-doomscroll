"use client";

import type { ChallengeLanguage } from "@/lib/challenge-lab";
import type { Monaco } from "@monaco-editor/react";
import dynamic from "next/dynamic";

const JSX_TYPES_PATH = "file:///challenge-lab/react-jsx-runtime.d.ts";
const JSX_TYPES_SOURCE = `declare module "react" {
  const React: any;
  export default React;
  export const Fragment: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useRef: any;
  export const useState: any;
  export const useReducer: any;
  export const startTransition: any;
}

declare module "react/jsx-runtime" {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}
`;

let isMonacoConfigured = false;

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[32rem] place-items-center rounded-2xl border border-(--border) bg-black/30 text-sm text-(--text-muted)">
      Loading editor...
    </div>
  ),
});

type MonacoCodeEditorProps = Readonly<{
  language: ChallengeLanguage;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  className?: string;
  path?: string;
}>;

function getEditorModel(language: ChallengeLanguage): {
  language: "javascript" | "typescript";
  path: string;
} {
  if (language === "jsx") {
    return {
      language: "javascript",
      path: "challenge.jsx",
    };
  }

  if (language === "js") {
    return {
      language: "javascript",
      path: "challenge.js",
    };
  }

  if (language === "tsx") {
    return {
      language: "typescript",
      path: "challenge.tsx",
    };
  }

  return {
    language: "typescript",
    path: "challenge.ts",
  };
}

function configureMonaco(monaco: Monaco) {
  if (isMonacoConfigured) {
    return;
  }

  const compilerOptions = {
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    isolatedModules: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    jsxImportSource: "react",
    lib: ["dom", "es2020"],
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    noEmit: true,
    target: monaco.languages.typescript.ScriptTarget.ES2020,
  };

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
    compilerOptions
  );
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
    compilerOptions
  );
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    JSX_TYPES_SOURCE,
    JSX_TYPES_PATH
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    JSX_TYPES_SOURCE,
    JSX_TYPES_PATH
  );

  isMonacoConfigured = true;
}

export function MonacoCodeEditor({
  language,
  value,
  onChange,
  readOnly = false,
  height = "32rem",
  className,
  path,
}: MonacoCodeEditorProps) {
  const model = getEditorModel(language);
  const editorPath = path || model.path;
  const containerClassName = className
    ? `${className} overflow-hidden rounded-2xl border border-(--border) bg-[#111317]`
    : "mt-3 overflow-hidden rounded-2xl border border-(--border) bg-[#111317]";

  return (
    <div className={containerClassName}>
      <Editor
        beforeMount={configureMonaco}
        height={height}
        language={model.language}
        path={editorPath}
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange?.(nextValue ?? "")}
        options={{
          automaticLayout: true,
          cursorBlinking: readOnly ? "solid" : "blink",
          fontSize: 14,
          formatOnPaste: true,
          insertSpaces: true,
          lineHeight: 24,
          minimap: {
            enabled: false,
          },
          padding: {
            top: 16,
            bottom: 16,
          },
          readOnly,
          domReadOnly: readOnly,
          renderLineHighlight: readOnly ? "none" : "line",
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            horizontal: "visible",
            horizontalScrollbarSize: 10,
            verticalScrollbarSize: 10,
          },
          scrollBeyondLastLine: false,
          scrollBeyondLastColumn: 6,
          tabSize: 2,
          wordWrap: "off",
        }}
      />
    </div>
  );
}
