export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
      <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
