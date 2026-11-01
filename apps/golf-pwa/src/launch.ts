export type Club = 'driver' | 'wood' | 'iron' | 'wedge';

export type LaunchMeasurement = {
  ballSpeedMps: number;
  launchAngleDeg: number;
  launchAzimuthDeg: number;
};

export type LaunchEstimate = {
  carryMeters: number;
  totalMeters: number;
  offlineMeters: number;
  directionDeg: number;
};

const GRAVITY_MPS2 = 9.80665;

const rollRatio: Record<Club, number> = {
  driver: 0.12,
  wood: 0.1,
  iron: 0.05,
  wedge: 0.015
};

export const isLaunchMeasurementValid = (measurement: LaunchMeasurement): boolean =>
  Number.isFinite(measurement.ballSpeedMps) && measurement.ballSpeedMps > 0 && measurement.ballSpeedMps <= 100
  && Number.isFinite(measurement.launchAngleDeg) && measurement.launchAngleDeg > 0 && measurement.launchAngleDeg < 90
  && Number.isFinite(measurement.launchAzimuthDeg) && Math.abs(measurement.launchAzimuthDeg) <= 90;

export const estimateLaunch = (club: Club, measurement: LaunchMeasurement): LaunchEstimate | null => {
  if (!isLaunchMeasurementValid(measurement)) return null;

  const launchAngleRad = measurement.launchAngleDeg * Math.PI / 180;
  const azimuthRad = measurement.launchAzimuthDeg * Math.PI / 180;
  const planarCarry = (measurement.ballSpeedMps ** 2 * Math.sin(2 * launchAngleRad)) / GRAVITY_MPS2;
  const carryMeters = planarCarry * Math.cos(azimuthRad);
  const offlineMeters = planarCarry * Math.sin(azimuthRad);

  return {
    carryMeters: Math.max(0, carryMeters),
    totalMeters: Math.max(0, carryMeters * (1 + rollRatio[club])),
    offlineMeters,
    directionDeg: measurement.launchAzimuthDeg
  };
};
