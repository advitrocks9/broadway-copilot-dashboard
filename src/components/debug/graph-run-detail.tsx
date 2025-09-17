"use client"

import * as React from "react"
import { Prisma } from "@prisma/client"
import {
  Activity,
  AlertTriangle,
  Bot,
  ChevronRight,
  Clock,
  Clipboard,
  Link as LinkIcon,
  X,
  Zap,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import "react18-json-view/src/style.css"
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

function isLLMTrace(item: NodeRun | LLMTrace | ErrorTrace): item is LLMTrace {
  return "model" in item
}

function isErrorTrace(item: NodeRun | LLMTrace | ErrorTrace): item is ErrorTrace {
  return "type" in item && item.type === 'error'
}

function LLMTraceDetail({ trace }: { trace: LLMTrace }) {
  const inputMessages = trace.inputMessages
    ? (trace.inputMessages as { role: string; content: string | object }[])
    : []

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">{trace.model}</h3>
          <Badge variant="outline">{trace.id}</Badge>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(trace.id)}
          >
            <Clipboard className="h-4 w-4" />
          </Button>
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
            <h4 className="font-semibold mb-3">Messages</h4>
            <div className="space-y-3">
              {inputMessages.map((msg, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize">
                      {msg.role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {typeof msg.content === "string"
                        ? msg.content
                        : JSON.stringify(msg.content, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Output</h4>
              <Card>
                <CardContent className="p-4">
                  <pre className="text-xs font-mono overflow-auto max-h-[600px] text-muted-foreground">
                    {JSON.stringify(trace.rawResponse, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
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
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg text-red-600 font-semibold">Graph run errored</h3>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <div>
            <Card>
              <CardHeader className="pb-2">
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
                <pre className="text-xs font-mono overflow-auto max-h-[600px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
