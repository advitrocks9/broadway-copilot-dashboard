"use client"

import * as React from "react"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import ReactMarkdown from "react-markdown"
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  Clock,
  Clipboard,
  Link as LinkIcon,
  X,
  Zap,
  Eye,
  Code,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { PlainCodeBlock, HighlightedCodeBlock } from "@/components/debug/markdown-code"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export type GraphRunPayload = Prisma.GraphRunGetPayload<{
  include: {
    nodeRuns: {
      include: {
        llmTraces: true
      }
    }
  }
}>

type LLMTrace = GraphRunPayload["nodeRuns"][0]["llmTraces"][0] & {
  tags?: string[]
}
type NodeRun = GraphRunPayload["nodeRuns"][0]
type ErrorTrace = {
  id: string
  type: "error"
  errorTrace: string
  graphRunId: string
}

type ToolCall = {
  id: string
  type: string
  function?: {
    name: string
    arguments: string
  }
}

type ParsedLLMResponse = {
  model: string
  usage: Record<string, unknown>
  toolCalls: ToolCall[]
  content: string | null
  finishReason: string | null
}

type RawLLMResponse = {
  model?: string
  usage?: Record<string, unknown>
  choices?: Array<{
    message?: {
      content?: string
      tool_calls?: Array<{
        id: string
        type: string
        function?: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason?: string
  }>
}

const inputMessageSchema = z.object({
  role: z.string(),
  content: z.union([z.string(), z.record(z.string(), z.unknown())]),
})

function isLLMTrace(item: NodeRun | LLMTrace | ErrorTrace): item is LLMTrace {
  return "model" in item
}

function isErrorTrace(item: NodeRun | LLMTrace | ErrorTrace): item is ErrorTrace {
  return "type" in item && item.type === "error"
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function parseJsonResponse(rawResponse: unknown): ParsedLLMResponse | null {
  try {
    let response: RawLLMResponse
    if (typeof rawResponse === "string") {
      response = JSON.parse(rawResponse) as RawLLMResponse
    } else {
      response = rawResponse as RawLLMResponse
    }

    const parsed: ParsedLLMResponse = {
      model: response.model || "Unknown",
      usage: response.usage || {},
      toolCalls: [],
      content: null,
      finishReason: null,
    }

    if (response.choices && response.choices[0]) {
      const choice = response.choices[0]
      if (choice.message) {
        parsed.content = choice.message.content || null
        parsed.finishReason = choice.finish_reason || null

        if (choice.message.tool_calls) {
          parsed.toolCalls = choice.message.tool_calls.map((tc) => ({
            id: tc.id,
            type: tc.type,
            function: tc.function
              ? {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                }
              : undefined,
          }))
        }
      }
    }

    return parsed
  } catch {
    return null
  }
}

/** Detail view for a single LLM trace showing input messages, parsed output, and tool calls */
function LLMTraceDetail({ trace }: { trace: LLMTrace }) {
  const [showRawJson, setShowRawJson] = React.useState(false)
  const inputMessages = Array.isArray(trace.inputMessages)
    ? trace.inputMessages
        .map((msg) => inputMessageSchema.safeParse(msg))
        .filter((r): r is z.ZodSafeParseSuccess<z.infer<typeof inputMessageSchema>> => r.success)
        .map((r) => r.data)
    : []

  const parsedResponse = parseJsonResponse(trace.rawResponse)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">{trace.model}</h3>
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {trace.durationMs ? `${trace.durationMs}ms` : "N/A"}
          </span>
          <span>{trace.totalTokens} tokens</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-4">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Messages</h2>
            <div className="space-y-3">
              {inputMessages.map((msg, index) => {
                const rawContent =
                  typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content, null, 2)

                return (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm capitalize">{msg.role}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(rawContent)}
                          className="h-7 w-7 p-0"
                        >
                          <Clipboard className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {typeof msg.content === "string" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown components={{ code: PlainCodeBlock }}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="text-foreground overflow-auto rounded p-3 font-mono text-sm">
                          {JSON.stringify(msg.content, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
          <Separator />
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Output</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-2"
              >
                {showRawJson ? (
                  <>
                    <Eye className="h-3 w-3" />
                    Show Parsed
                  </>
                ) : (
                  <>
                    <Code className="h-3 w-3" />
                    Show Raw JSON
                  </>
                )}
              </Button>
            </div>

            {showRawJson ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Raw JSON</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(JSON.stringify(trace.rawResponse, null, 2))}
                      className="h-7 w-7 p-0"
                    >
                      <Clipboard className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-full">
                    <pre className="text-foreground overflow-auto p-4 font-mono text-xs">
                      {JSON.stringify(trace.rawResponse, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {parsedResponse?.content && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown components={{ code: HighlightedCodeBlock }}>
                          {parsedResponse.content}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {parsedResponse?.toolCalls && parsedResponse.toolCalls.length > 0 && (
                  <>
                    {parsedResponse.toolCalls.map((toolCall, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm">Tool Call</CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {toolCall.function?.name || "Unknown"}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const args = toolCall.function?.arguments
                                  ? JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)
                                  : "{}"
                                const toolCallString = `Tool Call: ${toolCall.function?.name}\nID: ${toolCall.id}\nArguments:\n${args}`
                                copyToClipboard(toolCallString)
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Clipboard className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-muted-foreground font-mono text-xs">
                            ID: {toolCall.id}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {toolCall.function?.arguments && (
                            <pre className="text-foreground overflow-auto rounded p-3 font-mono text-xs">
                              {JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}
                            </pre>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorTraceDetail({ error }: { error: ErrorTrace }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="text-destructive h-5 w-5" />
          <h3 className="text-destructive text-lg font-semibold">Graph run errored</h3>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-4">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Error Details</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-muted-foreground text-sm">Stack Trace</CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(error.errorTrace)}
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-foreground max-h-[600px] overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {error.errorTrace}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GraphRunDetailSkeleton() {
  return (
    <div className="flex h-full">
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <Skeleton className="mb-3 h-6 w-1/2" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex justify-between text-sm">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="ml-6 h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </ScrollArea>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 space-y-6 overflow-auto p-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}

/** Two-panel detail view for a graph run: sidebar tree navigation + trace content pane */
export function GraphRunDetail({
  graphRun,
  onClose,
}: {
  graphRun: GraphRunPayload | null
  onClose: () => void
}) {
  const [selectedItem, setSelectedItem] = React.useState<NodeRun | LLMTrace | ErrorTrace | null>(
    null,
  )

  React.useEffect(() => {
    if (graphRun) {
      // If there's an error trace, select it first
      if (graphRun.status === "ERROR" && graphRun.errorTrace) {
        const errorTrace: ErrorTrace = {
          id: graphRun.id,
          type: "error",
          errorTrace: graphRun.errorTrace || "No error trace available",
          graphRunId: graphRun.id,
        }
        setSelectedItem(errorTrace)
      } else if (graphRun.nodeRuns?.length) {
        const firstLlmTrace = graphRun.nodeRuns.flatMap((nr) => nr.llmTraces)[0]
        if (firstLlmTrace) {
          setSelectedItem(firstLlmTrace)
        }
      }
    }
  }, [graphRun])

  if (!graphRun) {
    return <div>No graph run details available.</div>
  }

  const formatDuration = (ms: number | null) => {
    if (ms === null) return "N/A"
    return `${(ms / 1000).toFixed(2)}s`
  }

  const totalTokens = graphRun.nodeRuns.reduce(
    (acc, nodeRun) =>
      acc + nodeRun.llmTraces.reduce((acc, trace) => acc + (trace.totalTokens ?? 0), 0),
    0,
  )

  return (
    <div className="flex h-full">
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <h3 className="mb-3 font-semibold">Graph Structure</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Time:</span>
              <span className="font-mono">{formatDuration(graphRun.durationMs)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tokens:</span>
              <span className="font-mono">{totalTokens}</span>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <SidebarGroup>
            <SidebarMenu>
              {/* Error section */}
              {graphRun.status === "ERROR" && graphRun.errorTrace && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      const errorTrace: ErrorTrace = {
                        id: graphRun.id,
                        type: "error",
                        errorTrace: graphRun.errorTrace || "No error trace available",
                        graphRunId: graphRun.id,
                      }
                      setSelectedItem(errorTrace)
                    }}
                    isActive={
                      !!(
                        selectedItem &&
                        isErrorTrace(selectedItem) &&
                        selectedItem?.graphRunId === graphRun.id
                      )
                    }
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="flex-1 text-left font-semibold text-red-600">Error</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Node runs */}
              {graphRun.nodeRuns.map((nodeRun) => (
                <Collapsible
                  key={nodeRun.id}
                  asChild
                  defaultOpen={true}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild disabled={nodeRun.llmTraces.length === 0}>
                      <SidebarMenuButton>
                        <LinkIcon className="h-4 w-4" />
                        <span className="flex-1 text-left">{nodeRun.nodeName}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatDuration(nodeRun.durationMs)}
                        </span>
                        {nodeRun.llmTraces.length > 0 && (
                          <ChevronRight className="ml-2 h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {nodeRun.llmTraces.length > 0 && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {nodeRun.llmTraces.map((trace) => (
                            <SidebarMenuSubItem key={trace.id}>
                              <SidebarMenuSubButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedItem(trace)
                                }}
                                isActive={
                                  !!(
                                    selectedItem &&
                                    isLLMTrace(selectedItem) &&
                                    selectedItem?.id === trace.id
                                  )
                                }
                              >
                                <Bot className="h-4 w-4" />
                                <span className="flex-1 text-left">{trace.model}</span>
                                <span className="text-muted-foreground text-xs">
                                  {formatDuration(trace.durationMs)}
                                </span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Trace Details</h2>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedItem ? (
            isErrorTrace(selectedItem) ? (
              <ErrorTraceDetail error={selectedItem} />
            ) : isLLMTrace(selectedItem) ? (
              <LLMTraceDetail trace={selectedItem} />
            ) : (
              <p className="p-4">Select an LLM trace or error to see details.</p>
            )
          ) : (
            <p className="p-4">Select an LLM trace or error to see details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
