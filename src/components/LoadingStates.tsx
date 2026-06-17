import React from 'react';

/** Skeleton for a card-style block */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-muted p-6 animate-pulse ${className}`}>
      <div className="h-3 bg-surface-container-high rounded-full w-1/3 mb-3" />
      <div className="h-7 bg-surface-container-high rounded-full w-1/2 mb-4" />
      <div className="h-3 bg-surface-container rounded-full w-full mb-2" />
      <div className="h-3 bg-surface-container rounded-full w-4/5" />
    </div>
  );
}

/** Skeleton for a list row */
export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 animate-pulse ${className}`}>
      <div className="w-12 h-12 rounded-full bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-container-high rounded-full w-2/5" />
        <div className="h-3 bg-surface-container rounded-full w-3/5" />
      </div>
      <div className="h-8 w-20 bg-surface-container rounded-lg" />
    </div>
  );
}

/** Full-screen loading state shown while Firebase data is loading */
export function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
        <div>
          <p className="font-serif text-xl font-semibold text-primary">Elena</p>
          <p className="text-sm text-on-surface-variant mt-1">Cargando tu salón...</p>
        </div>
      </div>
    </div>
  );
}

/** Inline error state with retry button */
export function ErrorState({
  message = 'No se pudieron cargar los datos.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-2xl text-red-500">wifi_off</span>
      </div>
      <div>
        <p className="font-semibold text-primary mb-1">Error de conexión</p>
        <p className="text-sm text-on-surface-variant max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Dashboard skeleton — shown while data loads */
export function DashboardSkeleton() {
  return (
    <div className="flex-1 pb-16 animate-pulse">
      <div className="flex justify-between items-center h-20 mb-8 border-b border-primary/5">
        <div className="h-10 w-64 bg-surface-container-high rounded-full" />
        <div className="flex gap-4">
          <div className="h-10 w-10 bg-surface-container-high rounded-full" />
          <div className="h-10 w-10 bg-surface-container-high rounded-full" />
        </div>
      </div>
      <div className="mb-10">
        <div className="h-8 w-64 bg-surface-container-high rounded-full mb-2" />
        <div className="h-4 w-96 bg-surface-container rounded-full" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-12">
        <div className="xl:col-span-4 bg-surface-container-high rounded-3xl min-h-[250px]" />
        <div className="xl:col-span-8 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-container-high rounded-xl h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}
