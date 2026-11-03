import { describe, expect, it } from 'vitest';
import { parseWeatherForecast } from './weather';

describe('weather forecast', () => {
  it('reads temperature and condition from a compact forecast', () => {
    expect(parseWeatherForecast({ properties: { timeseries: [{ data: { instant: { details: { air_temperature: 17.6 } }, next_1_hours: { summary: { symbol_code: 'partlycloudy_day' } } } }] } })).toEqual({ temperatureC: 18, condition: '구름 조금' });
  });

  it('rejects missing forecast data', () => {
    expect(parseWeatherForecast({ properties: { timeseries: [] } })).toBeNull();
    expect(parseWeatherForecast({ properties: { timeseries: [{ data: { instant: { details: {} } } }] } })).toBeNull();
  });
});
