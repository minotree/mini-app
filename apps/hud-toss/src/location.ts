import { Accuracy, Device } from '@apps-in-toss/web-framework';

type Fix = { latitude: number; longitude: number; accuracy: number; timestamp: number };
export type SpeedSample = { speedKmh: number | null; accuracy: number };

export function estimateSpeed(previous: Fix | null, current: Fix): number | null {
  if (!previous || previous.accuracy > 50 || current.accuracy > 50) return null;
  const seconds = (current.timestamp - previous.timestamp) / 1000;
  if (seconds < 2 || seconds > 30) return null;
  const radians = Math.PI / 180;
  const dLat = (current.latitude - previous.latitude) * radians;
  const dLon = (current.longitude - previous.longitude) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(previous.latitude * radians) * Math.cos(current.latitude * radians) * Math.sin(dLon / 2) ** 2;
  const distance = 12_742_000 * Math.asin(Math.min(1, Math.sqrt(a)));
  if (distance < Math.max(4, (previous.accuracy + current.accuracy) / 4)) return 0;
  const speed = distance / seconds * 3.6;
  return speed <= 200 ? speed : null;
}

export function watchSpeed(onUpdate: (sample: SpeedSample) => void, onError: () => void): () => void {
  let previous: Fix | null = null;
  return Device.subscribeLocation({
    options: { accuracy: Accuracy.High, timeInterval: 3000, distanceInterval: 0 },
    onEvent: (location) => {
      const current: Fix = { ...location.coords, timestamp: location.timestamp };
      onUpdate({ speedKmh: estimateSpeed(previous, current), accuracy: current.accuracy });
      previous = current;
    },
    onError,
  });
}
