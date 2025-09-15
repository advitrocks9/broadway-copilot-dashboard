"use client"

import * as React from "react"
import { toast } from "sonner"
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MessageThreadClient } from "@/components/users/MessageThreadClient"

type UserRow = {
  id: string
  waId: string
  createdAt: string
  lastActive: string | null
  messages: number
  cost: number
}

export function UsersTable({ rows, onRemoved }: { rows: UserRow[]; onRemoved?: (waId: string) => void }) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [data, setData] = React.useState<UserRow[]>(rows)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)

  React.useEffect(() => setData(rows), [rows])

  async function remove(waId: string) {
    const res = await fetch(`/api/users/whitelist?waId=${encodeURIComponent(waId)}`, { method: "DELETE" })
    if (res.status === 204) {
      toast.success("Removed from whitelist")
      setData((prev) => prev.filter((r) => r.waId !== waId))
      onRemoved?.(waId)
      return
    }
    const body = await res.json().catch(() => ({} as any)) as { error?: string }
    toast.error(body?.error || "Failed to remove")
  }

  const columns = React.useMemo<ColumnDef<UserRow>[]>(
    () => [
      { accessorKey: "waId", header: "Identifier", cell: ({ row }) => row.original.waId },
      { accessorKey: "createdAt", header: "Created", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
      { accessorKey: "lastActive", header: "Last active", cell: ({ row }) => row.original.lastActive ? new Date(row.original.lastActive).toLocaleString() : "-" },
      { accessorKey: "messages", header: "Total messages" },
      { accessorKey: "cost", header: "Total cost", cell: ({ row }) => `$${row.original.cost.toFixed(4)}` },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="text-right space-x-2">
            <Button variant="outline" size="sm" onClick={() => remove(row.original.waId)}>Remove</Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">View details</Button>
              </SheetTrigger>
              <SheetContent className="w-[560px] sm:max-w-[640px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Conversation with {row.original.waId}</SheetTitle>
                </SheetHeader>
                <MessageThreadClient userId={row.original.id} />
              </SheetContent>
            </Sheet>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
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
          <Input id="filter" placeholder="Filter by waId" value={globalFilter ?? ""} onChange={(e) => setGlobalFilter(e.target.value)} className="w-60" />
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


