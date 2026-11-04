import { Accuracy, Device } from '@apps-in-toss/web-framework';

export type LocationSnapshot = { speedKmh: number | null; latitude: number; longitude: number };
type Fix = { latitude: number; longitude: number; accuracy: number; timestamp: number };

export const distanceMeters = (a: Fix, b: Fix): number => {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(x)));
};

export const estimateSpeedKmh = (previous: Fix | null, current: Fix): number | null => {
  if (!previous || current.accuracy > 50 || previous.accuracy > 50) return null;
  const seconds = (current.timestamp - previous.timestamp) / 1_000;
  if (seconds < 2 || seconds > 30) return null;
  const distance = distanceMeters(previous, current);
  if (distance < Math.max(4, (previous.accuracy + current.accuracy) / 4)) return 0;
  const speed = distance / seconds * 3.6;
  return speed <= 80 ? Math.round(speed * 10) / 10 : null;
};

export const watchTossLocation = (onUpdate: (snapshot: LocationSnapshot) => void, onError: () => void): (() => void) => {
  let previous: Fix | null = null;
  return Device.subscribeLocation({
    options: { accuracy: Accuracy.High, timeInterval: 3000, distanceInterval: 0 },
    onEvent: (location) => {
      const current = { ...location.coords, timestamp: location.timestamp };
      onUpdate({ speedKmh: estimateSpeedKmh(previous, current), latitude: current.latitude, longitude: current.longitude });
      previous = current;
    },
    onError: () => onError(),
  });
};
