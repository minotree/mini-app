export type HudSettings = {
  color: string;
  fontScale: number;
  fontWeight: 400 | 700 | 900;
  mirror: boolean;
};

export const DEFAULT_HUD_SETTINGS: HudSettings = {
  color: '#7CFF8A',
  fontScale: 1,
  fontWeight: 900,
  mirror: false
};

export const SETTINGS_STORAGE_KEY = 'mini-apps.hud.settings.v1';

export const speedKmhFromMetersPerSecond = (metersPerSecond: number | null): number => {
  const rawKmh = Math.max(0, (metersPerSecond ?? 0) * 3.6);
  return rawKmh < 3 ? 0 : Math.round(rawKmh);
};

export const smoothSpeed = (previous: number | null, next: number, alpha = 0.35): number =>
  previous === null ? next : previous + alpha * (next - previous);

export const loadHudSettings = (value: string | null): HudSettings => {
  if (!value) return DEFAULT_HUD_SETTINGS;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_HUD_SETTINGS;
    const candidate = parsed as Partial<HudSettings>;
    const fontScale = typeof candidate.fontScale === 'number' && candidate.fontScale >= 0.75 && candidate.fontScale <= 1.25
      ? candidate.fontScale
      : DEFAULT_HUD_SETTINGS.fontScale;
    const fontWeight = candidate.fontWeight === 400 || candidate.fontWeight === 700 || candidate.fontWeight === 900
      ? candidate.fontWeight
      : DEFAULT_HUD_SETTINGS.fontWeight;
    return {
      color: typeof candidate.color === 'string' && /^#[0-9a-f]{6}$/i.test(candidate.color)
        ? candidate.color
        : DEFAULT_HUD_SETTINGS.color,
      fontScale,
      fontWeight,
      mirror: typeof candidate.mirror === 'boolean' ? candidate.mirror : DEFAULT_HUD_SETTINGS.mirror
    };
  } catch {
    return DEFAULT_HUD_SETTINGS;
  }
};
