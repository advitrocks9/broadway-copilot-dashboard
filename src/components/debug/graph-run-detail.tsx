"use client"

import * as React from "react"
import { Prisma } from "@prisma/client"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  type: 'error'
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

function isLLMTrace(item: NodeRun | LLMTrace | ErrorTrace): item is LLMTrace {
  return "model" in item
}

function isErrorTrace(item: NodeRun | LLMTrace | ErrorTrace): item is ErrorTrace {
  return "type" in item && item.type === 'error'
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function parseJsonResponse(rawResponse: unknown): ParsedLLMResponse | null {
  try {
    let response: RawLLMResponse
    if (typeof rawResponse === 'string') {
      response = JSON.parse(rawResponse) as RawLLMResponse
    } else {
      response = rawResponse as RawLLMResponse
    }
    
    const parsed: ParsedLLMResponse = {
      model: response.model || 'Unknown',
      usage: response.usage || {},
      toolCalls: [],
      content: null,
      finishReason: null
    }
    
    // Extract tool calls
    if (response.choices && response.choices[0]) {
      const choice = response.choices[0]
      if (choice.message) {
        parsed.content = choice.message.content || null
        parsed.finishReason = choice.finish_reason || null
        
        if (choice.message.tool_calls) {
          parsed.toolCalls = choice.message.tool_calls.map((tc) => ({
            id: tc.id,
            type: tc.type,
            function: tc.function ? {
              name: tc.function.name,
              arguments: tc.function.arguments
            } : undefined
          }))
        }
      }
    }
    
    return parsed
  } catch {
    return null
  }
}


function LLMTraceDetail({ trace }: { trace: LLMTrace }) {
  const [showRawJson, setShowRawJson] = React.useState(false)
  const inputMessages = trace.inputMessages
    ? (trace.inputMessages as { role: string; content: string | object }[])
    : []
  
  const parsedResponse = parseJsonResponse(trace.rawResponse)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">{trace.model}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {trace.durationMs ? `${trace.durationMs}ms` : "N/A"}
          </span>
          <span>{trace.totalTokens} tokens</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <div>
            <h2 className="font-semibold text-xl mb-4">Messages</h2>
            <div className="space-y-3">
              {inputMessages.map((msg, index) => {
                const rawContent = typeof msg.content === "string" 
                  ? msg.content 
                  : JSON.stringify(msg.content, null, 2)
                
                  return (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm capitalize">
                            {msg.role}
                          </CardTitle>
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
                            <ReactMarkdown
                              components={{
                                code(props) {
                                  const {children, className, ...rest} = props
                                  const match = /language-(\w+)/.exec(className || '')
                                  const isInline = !match
                                  return !isInline ? (
                                    <pre className="text-sm font-mono text-foreground p-3 rounded-md overflow-auto">
                                      <code>{String(children).replace(/\n$/, '')}</code>
                                    </pre>
                                  ) : (
                                    <code className="text-sm font-mono text-muted-foreground px-1 py-0.5 rounded" {...rest}>
                                      {children}
                                    </code>
                                  )
                                }
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <pre className="text-sm font-mono text-foreground p-3 rounded overflow-auto">
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-xl">Output</h2>
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
                    <pre className="text-xs font-mono text-foreground p-4 overflow-auto">
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
                        <ReactMarkdown
                          components={{
                            code(props) {
                              const {children, className, ...rest} = props
                              const match = /language-(\w+)/.exec(className || '')
                              const isInline = !match
                              return !isInline ? (
                                <SyntaxHighlighter
                                  language={match[1]}
                                  style={oneDark}
                                  customStyle={{
                                    fontSize: '12px',
                                    margin: '8px 0',
                                  }}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="text-sm font-mono text-muted-foreground px-1 py-0.5 rounded" {...rest}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
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
                                {toolCall.function?.name || 'Unknown'}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const args = toolCall.function?.arguments ? JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2) : '{}'
                                const toolCallString = `Tool Call: ${toolCall.function?.name}\nID: ${toolCall.id}\nArguments:\n${args}`
                                copyToClipboard(toolCallString)
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Clipboard className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {toolCall.id}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {toolCall.function?.arguments && (
                            <pre className="text-xs font-mono text-foreground p-3 rounded overflow-auto">
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg text-destructive font-semibold">Graph run errored</h3>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <div>
            <h2 className="font-semibold text-xl mb-4">Error Details</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Stack Trace
                  </CardTitle>
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
                <pre className="text-xs font-mono overflow-auto max-h-[600px] text-foreground leading-relaxed whitespace-pre-wrap">
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
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-1/2 mb-3" />
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
            <Skeleton className="h-10 w-full ml-6" />
            <Skeleton className="h-10 w-full" />
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}

export function GraphRunDetail({
  graphRun,
  onClose,
}: {
  graphRun: GraphRunPayload | null
  onClose: () => void
}) {
  const [selectedItem, setSelectedItem] = React.useState<
    NodeRun | LLMTrace | ErrorTrace | null
  >(null)

  React.useEffect(() => {
    if (graphRun) {
      // If there's an error trace, select it first
      if (graphRun.status === 'ERROR' && graphRun.errorTrace) {
        const errorTrace: ErrorTrace = {
          id: graphRun.id,
          type: 'error',
          errorTrace: graphRun.errorTrace || 'No error trace available',
          graphRunId: graphRun.id
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
      acc +
      nodeRun.llmTraces.reduce((acc, trace) => acc + (trace.totalTokens ?? 0), 0),
    0
  )

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-3">Graph Structure</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Time:</span>
              <span className="font-mono">
                {formatDuration(graphRun.durationMs)}
              </span>
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
              {graphRun.status === 'ERROR' && graphRun.errorTrace && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      const errorTrace: ErrorTrace = {
                        id: graphRun.id,
                        type: 'error',
                        errorTrace: graphRun.errorTrace || 'No error trace available',
                        graphRunId: graphRun.id
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
                    <span className="flex-1 text-left text-red-600 font-semibold">
                      Error
                    </span>
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
                    <CollapsibleTrigger
                      asChild
                      disabled={nodeRun.llmTraces.length === 0}
                    >
                      <SidebarMenuButton>
                        <LinkIcon className="h-4 w-4" />
                        <span className="flex-1 text-left">
                          {nodeRun.nodeName}
                        </span>
                        <span className="text-xs text-muted-foreground">
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
                                <span className="flex-1 text-left">
                                  {trace.model}
                                </span>
                                <span className="text-xs text-muted-foreground">
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
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
