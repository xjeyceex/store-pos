import { cn } from "@/lib/utils";

export type MobileRecordField = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

export function MobileRecordCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  fields?: MobileRecordField[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-xs",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {fields && fields.length > 0 ? (
        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {fields.map((field) => (
            <div key={field.label} className={cn("min-w-0", field.className)}>
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="font-medium tabular-nums">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actions ? (
        <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function MobileRecordList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 md:hidden", className)}>{children}</div>
  );
}

export function DesktopTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden md:block", className)}>{children}</div>
  );
}
