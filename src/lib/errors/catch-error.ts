export async function catchError<T>(
  promise: Promise<T>,
): Promise<[Error | undefined, T | undefined]> {
  try {
    const data = await promise;
    return [undefined, data];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), undefined];
  }
}
