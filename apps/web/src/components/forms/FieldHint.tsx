export function FieldHint({ children }: { children: string }) {
  return (
    <p className="mt-1 max-w-2xl text-xs leading-snug text-muted-foreground">
      {children}
    </p>
  );
}
