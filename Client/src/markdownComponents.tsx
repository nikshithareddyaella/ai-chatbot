import {
  isValidElement,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { Components } from "react-markdown";
import { copyText } from "./clipboard";

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l4 4L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getLanguage(className?: string) {
  const match = className?.match(/language-([\w-]+)/);
  return match?.[1] ?? null;
}

function getLanguageFromChildren(children: ReactNode) {
  const child = Array.isArray(children) ? children[0] : children;
  if (isValidElement<{ className?: string }>(child)) {
    return getLanguage(child.props.className);
  }
  return null;
}

function PreWithCopy({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text =
      preRef.current?.querySelector("code")?.textContent ??
      preRef.current?.textContent ??
      "";

    try {
      await copyText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied or unavailable
    }
  };

  const language = getLanguageFromChildren(children);

  return (
    <div className="code-block">
      <div className="code-block-toolbar">
        {language && <span className="code-block-lang">{language}</span>}
        <button
          type="button"
          className={`code-copy-btn${copied ? " copied" : ""}`}
          onClick={handleCopy}
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}

export const markdownComponents: Components = {
  pre: PreWithCopy,
};
