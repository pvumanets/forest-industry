export function PlaceholderSectionPage({ title }: { title: string }) {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
      <p className="text-muted-foreground">Раздел в разработке.</p>
    </>
  );
}
