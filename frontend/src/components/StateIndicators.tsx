export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="state state--loading">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: Error | string; retry?: () => void }) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div className="state state--error">
      <strong>Something went wrong:</strong>
      <p>{message}</p>
      {retry ? (
        <button type="button" onClick={retry} className="btn btn-secondary">
          Try again
        </button>
      ) : null}
    </div>
  );
}
