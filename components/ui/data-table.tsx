"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  searchValue?: (row: T) => string;
  className?: string;
  align?: "left" | "right" | "center";
  width?: string;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  initialSort?: SortState;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchPlaceholder = "Search...",
  pageSize = 25,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your search.",
  onRowClick,
  initialSort = null,
}: Props<T>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(initialSort);
  const [page, setPage] = React.useState(0);

  const searchableCols = React.useMemo(
    () => columns.filter((c) => c.searchValue),
    [columns],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      searchableCols.some((c) => c.searchValue!(row).toLowerCase().includes(q)),
    );
  }, [data, query, searchableCols]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    const sv = col.sortValue;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  React.useEffect(() => {
    setPage(0);
  }, [query, sort]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  return (
    <div className="space-y-3">
      {searchableCols.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label="Search table"
          />
        </div>
      )}

      <div className="glass overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface/80 backdrop-blur-glass">
              <tr className="border-b border-border/40">
                {columns.map((col) => {
                  const sortable = !!col.sortValue;
                  const sortActive = sort?.key === col.key;
                  const ariaSort: React.AriaAttributes["aria-sort"] = sortActive
                    ? sort?.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : sortable
                    ? "none"
                    : undefined;
                  const Icon = !sortActive
                    ? ArrowUpDown
                    : sort?.dir === "asc"
                    ? ArrowUp
                    : ArrowDown;
                  return (
                    <th
                      key={col.key}
                      aria-sort={ariaSort}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        !col.align && "text-left",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={cn(
                            "focus-ring inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground",
                            sortActive && "text-foreground",
                          )}
                        >
                          {col.header}
                          <Icon className="h-3 w-3" />
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted/50 text-muted-foreground">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">{emptyTitle}</p>
                      <p className="max-w-sm text-xs text-muted-foreground">
                        {emptyDescription}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border/30 transition-colors last:border-0",
                      onRowClick && "cursor-pointer hover:bg-surface/50",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.className,
                        )}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground tabular-nums">
            Showing {safePage * pageSize + 1}–
            {Math.min((safePage + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              Previous
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
