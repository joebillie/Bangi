export type HeadingReading = { trueHeading: number; accuracy: number };
export type HeadingDependencies = {
  available: () => Promise<boolean>;
  permission: () => Promise<boolean>;
  watch: (
    callback: (value: HeadingReading) => void,
  ) => Promise<{ remove: () => void }>;
};
/** Owns asynchronous sensor registration, including disposal while permission is pending. */
export function startHeadingSession(
  deps: HeadingDependencies,
  onReading: (value: HeadingReading) => void,
  onError: (message: string) => void,
) {
  let disposed = false;
  let received = false;
  let subscription: { remove: () => void } | undefined;
  const timeout = setTimeout(() => {
    if (!disposed && !received)
      onError(
        "No compass reading is available. Check location services or use the geographic bearing.",
      );
  }, 12000);
  void (async () => {
    if (!(await deps.available()))
      throw Error(
        "This device has no usable magnetometer. Use the geographic bearing below.",
      );
    if (disposed) return;
    if (!(await deps.permission()))
      throw Error(
        "Heading permission was denied. Use the geographic bearing below.",
      );
    if (disposed) return;
    subscription = await deps.watch((value) => {
      if (disposed) return;
      received = true;
      clearTimeout(timeout);
      onReading(value);
    });
    if (disposed) subscription.remove();
  })().catch((e) => {
    clearTimeout(timeout);
    if (!disposed)
      onError(
        e instanceof Error
          ? e.message
          : "Compass unavailable. Use the geographic bearing.",
      );
  });
  return () => {
    disposed = true;
    clearTimeout(timeout);
    subscription?.remove();
  };
}
export function smoothHeading(previous: number | null, next: number) {
  return previous === null
    ? next
    : (previous + (((next - previous + 540) % 360) - 180) * 0.25 + 360) % 360;
}
