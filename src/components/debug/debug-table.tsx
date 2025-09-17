"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLayoutColumns,
  IconLoader,
  IconRefresh,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  GraphRunDetail,
  GraphRunPayload,
  GraphRunDetailSkeleton,
} from "@/components/debug/graph-run-detail"

export const schema = z.object({
  graphRunId: z.string(),
  userphoneNumber: z.string(),
  status: z.string(),
  totalTokens: z.string(),
  timeTaken: z.string(),
  startedAt: z.string(),
  userMessage: z.string(),
  assistantReply: z.string(),
})

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    accessorKey: "userphoneNumber",
    header: "Phone Number",
    cell: ({ row }) => <div className="pl-4">{row.original.userphoneNumber}</div>
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status.toLowerCase()
      let icon = <IconLoader className="animate-spin" />
      if (status === "completed") icon = <IconCircleCheckFilled className="text-green-500" />
      if (status === "error") icon = <IconCircleXFilled className="text-red-500" />
      return <Badge variant="outline" className="text-muted-foreground px-1.5">{icon} {status}</Badge>
    }
  },
  {
    accessorKey: "userMessage",
    header: "User Message",
    cell: ({ row }) => <div className="truncate max-w-xs">{row.original.userMessage}</div>
  },
  {
    accessorKey: "assistantReply",
    header: "Assistant Reply",
    cell: ({ row }) => <div className="truncate max-w-xs">{row.original.assistantReply}</div>
  },
  {
    accessorKey: "totalTokens",
    header: "Total Tokens",
  },
  {
    accessorKey: "startedAt",
    header: "Started At",
  },
  {
    accessorKey: "timeTaken",
    header: "Time Taken",
  },
]

function ClickableRow({
  row,
  onRowClick,
}: {
  row: Row<z.infer<typeof schema>>
  onRowClick: (row: z.infer<typeof schema> | null) => void
}) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onRowClick(row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const [selectedRow, setSelectedRow] = React.useState<z.infer<
    typeof schema
  > | null>(null)
  const [detailData, setDetailData] = React.useState<GraphRunPayload | null>(
    null
  )
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data: initialData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.graphRunId,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  React.useEffect(() => {
    if (selectedRow) {
      setIsLoadingDetail(true)
      fetch(`/api/debug/graph-run/${selectedRow.graphRunId}`)
        .then((res) => res.json())
        .then((data) => {
          setDetailData(data)
        })
        .catch(console.error)
        .finally(() => {
          setIsLoadingDetail(false)
        })
    } else {
      setDetailData(null)
    }
  }, [selectedRow])

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <IconRefresh className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          
        </div>
      </div>
      <div className="relative flex flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-[5]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan} className={header.index === 0 ? "pl-4" : ""}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                <>
                  {table.getRowModel().rows.map((row) => (
                    <ClickableRow
                      key={row.id}
                      row={row}
                      onRowClick={setSelectedRow}
                    />
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            Showing {table.getRowModel().rows.length} row(s).
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Sheet
        open={!!selectedRow}
        onOpenChange={(open) => !open && setSelectedRow(null)}
      >
        <SheetContent className="min-w-[900px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Trace Details</SheetTitle>
            <SheetDescription>
              Detailed view of a trace, including node runs and LLM traces.
            </SheetDescription>
          </SheetHeader>
          <div className="h-full">
            {isLoadingDetail ? (
              <GraphRunDetailSkeleton />
            ) : (
              <GraphRunDetail
                graphRun={detailData}
                onClose={() => setSelectedRow(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
