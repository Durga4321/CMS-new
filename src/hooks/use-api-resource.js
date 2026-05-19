import { useCallback, useEffect, useRef, useState } from "react";

export function useApiResource(loader, initialValue) {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(err?.message ?? "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}
