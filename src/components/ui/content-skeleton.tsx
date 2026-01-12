import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export const CardSkeleton = ({ className, style }: SkeletonProps) => (
  <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)} style={style}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
    <Skeleton className="h-8 w-16" />
  </div>
);

export const TableRowSkeleton = ({ className, style }: SkeletonProps) => (
  <div className={cn("flex items-center gap-4 p-4 border-b", className)} style={style}>
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-6 w-16 rounded-full" />
    <Skeleton className="h-6 w-14 rounded-full" />
    <div className="ml-auto flex gap-2">
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  </div>
);

export const ListItemSkeleton = ({ className, style }: SkeletonProps) => (
  <div className={cn("rounded-lg border bg-card p-4", className)} style={style}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  </div>
);

export const ChartSkeleton = ({ className }: SkeletonProps) => (
  <div className={cn("space-y-4", className)}>
    <div className="flex items-end gap-2 h-48">
      {[40, 65, 45, 80, 55, 70].map((height, i) => (
        <Skeleton 
          key={i} 
          className="flex-1 rounded-t animate-pulse" 
          style={{ 
            height: `${height}%`,
            animationDelay: `${i * 100}ms`
          }} 
        />
      ))}
    </div>
    <div className="flex justify-between">
      {[1, 2, 3, 4, 5, 6].map((_, i) => (
        <Skeleton key={i} className="h-3 w-8" />
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Search Widget */}
    <Skeleton className="h-12 w-full rounded-lg" />

    {/* Stats Cards */}
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <CardSkeleton key={i} style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>

    {/* Charts */}
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <ChartSkeleton />
      </div>
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <ChartSkeleton />
      </div>
    </div>
  </div>
);

export const MemberListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <ListItemSkeleton 
        key={i} 
        className="animate-fade-in"
        style={{ animationDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
);

export const MemberTableSkeleton = () => (
  <div className="rounded-md border bg-card">
    <div className="p-4 border-b">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    </div>
    {[1, 2, 3, 4, 5].map((i) => (
      <TableRowSkeleton 
        key={i}
        style={{ animationDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
);
