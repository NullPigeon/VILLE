// Never expose provider HTML or an unreadable body as a JSON parser exception.
export async function readJsonResponse<T>(response: Response, operation: string): Promise<T> {
  let data: unknown;
  try {
    const text = await response.text();
    if (!text.trim()) throw new Error();
    data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
  } catch {
    throw new Error(`${operation}: the server returned an empty or invalid response (HTTP ${response.status}). Please retry; if it persists, contact the site operator.`);
  }
  if (!response.ok) {
    const error = (data as { error?: unknown }).error;
    throw new Error(typeof error === 'string' ? error : `${operation} failed (HTTP ${response.status}).`);
  }
  return data as T;
}
