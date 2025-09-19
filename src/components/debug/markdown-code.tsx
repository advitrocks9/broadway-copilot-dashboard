import type { ComponentPropsWithoutRef } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

type CodeProps = ComponentPropsWithoutRef<"code">

export function PlainCodeBlock(props: CodeProps) {
  const { children, className, ...rest } = props
  const match = /language-(\w+)/.exec(className || "")
  const isInline = !match
  return !isInline ? (
    <pre className="text-foreground overflow-auto rounded-md p-3 font-mono text-sm">
      <code>{String(children).replace(/\n$/, "")}</code>
    </pre>
  ) : (
    <code className="text-muted-foreground rounded px-1 py-0.5 font-mono text-sm" {...rest}>
      {children}
    </code>
  )
}

export function HighlightedCodeBlock(props: CodeProps) {
  const { children, className, ...rest } = props
  const match = /language-(\w+)/.exec(className || "")
  const isInline = !match
  return !isInline ? (
    <SyntaxHighlighter
      language={match[1]}
      style={oneDark}
      customStyle={{
        fontSize: "12px",
        margin: "8px 0",
      }}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  ) : (
    <code className="text-muted-foreground rounded px-1 py-0.5 font-mono text-sm" {...rest}>
      {children}
    </code>
  )
}
