export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="mt-1 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}
