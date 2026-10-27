"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  /**
   * Render inline HTML such as `<details>` hint blocks. Only enable for
   * trusted repo content, never for model output.
   */
  allowHtml?: boolean;
}

export function MarkdownRenderer({
  content,
  allowHtml = false,
}: Readonly<MarkdownRendererProps>) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={allowHtml ? [rehypeRaw] : []}
    >
      {content}
    </ReactMarkdown>
  );
}
