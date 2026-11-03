export type WeatherForecast = { temperatureC: number; condition: string };

const conditionFromCode = (code: string): string => {
  if (code.includes('thunder')) return '천둥번개';
  if (code.includes('snow')) return '눈';
  if (code.includes('sleet')) return '진눈깨비';
  if (code.includes('rain')) return '비';
  if (code.includes('fog')) return '안개';
  if (code.includes('partlycloudy')) return '구름 조금';
  if (code.includes('cloudy')) return '흐림';
  if (code.includes('fair')) return '대체로 맑음';
  if (code.includes('clearsky')) return '맑음';
  return '날씨 정보';
};

export const parseWeatherForecast = (raw: unknown): WeatherForecast | null => {
  if (!raw || typeof raw !== 'object') return null;
  const timeseries = (raw as { properties?: { timeseries?: unknown } }).properties?.timeseries;
  if (!Array.isArray(timeseries) || !timeseries[0] || typeof timeseries[0] !== 'object') return null;
  const data = timeseries[0].data;
  const temperature = data?.instant?.details?.air_temperature;
  if (typeof temperature !== 'number' || !Number.isFinite(temperature)) return null;
  const code = data?.next_1_hours?.summary?.symbol_code ?? data?.next_6_hours?.summary?.symbol_code;
  return { temperatureC: Math.round(temperature), condition: typeof code === 'string' ? conditionFromCode(code) : '날씨 정보' };
};
