"use client"

import * as React from "react"
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Trace = {
  id: string
  startTime: string | null
  durationMs: number | null
  model: string | null
  totalTokens: number | null
  inputMessages: unknown
  outputMessage: unknown
}

type Row = {
  id: string
  startTime: string
  user: string
  status: string
  durationMs: number | null
  tokens: number
  firstUserMsg: string
  traces: Trace[]
  errorTrace?: string | null
}

export function DebugTable({ rows }: { rows: Row[] }) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: "startTime", header: "Started at", cell: ({ row }) => new Date(row.original.startTime).toLocaleString() },
      { accessorKey: "user", header: "User" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "tokens", header: "Tokens" },
      { accessorKey: "durationMs", header: "Time (ms)", cell: ({ row }) => row.original.durationMs ?? "-" },
      { accessorKey: "firstUserMsg", header: "User msg", cell: ({ row }) => row.original.firstUserMsg.slice(0, 24) },
      {
        id: "assistant",
        header: "Assistant reply",
        cell: ({ row }) => (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="px-0 text-primary">View</Button>
            </SheetTrigger>
            <SheetContent className="w-[540px] sm:max-w-[640px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Run {row.original.id}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-2">
                <div className="text-sm">Status: {row.original.status}</div>
                <div className="text-sm">Duration: {row.original.durationMs ?? "-"} ms</div>
                <div className="space-y-2">
                  {row.original.traces
                    .slice()
                    .sort((a,b)=> (new Date(a.startTime||0).getTime()) - (new Date(b.startTime||0).getTime()))
                    .map((t) => (
                      <Card key={t.id}>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">{t.model} · {t.totalTokens ?? 0} tok · {t.durationMs ?? 0} ms</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xs whitespace-pre-wrap">Input: {JSON.stringify(t.inputMessages, null, 2)}</div>
                          <div className="text-xs whitespace-pre-wrap mt-2">Output: {JSON.stringify(t.outputMessage ?? {}, null, 2)}</div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {row.original.errorTrace ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-red-600">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap">{row.original.errorTrace}</pre>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, pagination: { pageIndex, pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater
      setPageIndex(next.pageIndex)
      setPageSize(next.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: "includesString",
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="filter" className="sr-only">Filter</Label>
          <Input id="filter" placeholder="Filter by user or status" value={globalFilter ?? ""} onChange={(e) => setGlobalFilter(e.target.value)} className="w-60" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button variant="outline" size="icon" className="hidden h-8 w-8 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <IconChevronsLeft />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <IconChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <IconChevronRight />
          </Button>
          <Button variant="outline" size="icon" className="hidden h-8 w-8 lg:flex" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


