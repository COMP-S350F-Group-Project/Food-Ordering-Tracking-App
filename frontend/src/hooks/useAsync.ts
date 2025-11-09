import { useCallback, useEffect, useRef, useState } from "react";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const execute = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await fn();
      if (mounted.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    execute().catch(() => {
      /* handled via error state */
    });
  }, [execute]);

  return { data, loading, error, execute, setData };
}
