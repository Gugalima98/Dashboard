import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-4 pb-8", className)}>
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-lg">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}