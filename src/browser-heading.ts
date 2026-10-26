export type BrowserReading = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};
/** Flat portrait phones only; relative alpha has no geographic reference. */
export function browserHeading(event: BrowserReading, declination: number) {
  if (
    event.beta === null ||
    !Number.isFinite(event.beta) ||
    !Number.isFinite(event.gamma) ||
    event.gamma === null ||
    Math.abs(event.beta) > 35 ||
    Math.abs(event.gamma) > 35
  )
    return null;
  let magnetic: number | undefined;
  if (
    typeof event.webkitCompassHeading === "number" &&
    Number.isFinite(event.webkitCompassHeading) &&
    event.webkitCompassHeading >= 0
  )
    magnetic = event.webkitCompassHeading;
  else if (
    event.absolute &&
    event.alpha !== null &&
    Number.isFinite(event.alpha)
  )
    magnetic = (360 - event.alpha) % 360;
  if (magnetic === undefined) return null;
  return {
    heading: (magnetic + declination + 360) % 360,
    reliable:
      event.webkitCompassAccuracy !== undefined
        ? event.webkitCompassAccuracy >= 0 && event.webkitCompassAccuracy <= 20
        : false,
  };
}
