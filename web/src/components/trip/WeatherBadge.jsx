import { LuCalendarClock, LuCloud, LuCloudFog, LuCloudLightning, LuCloudRain, LuCloudSun, LuSnowflake, LuSun } from 'react-icons/lu'

// OpenWeatherMap icon codes ("10d") mapped to icons by their numeric prefix
const ICONS = { '01': LuSun, '02': LuCloudSun, '03': LuCloud, '04': LuCloud, '09': LuCloudRain, '10': LuCloudRain, '11': LuCloudLightning, '13': LuSnowflake, '50': LuCloudFog }

const WeatherBadge = ({ weather }) => {
  if (!weather) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600" title="Forecasts are available up to 5 days ahead">
        <LuCalendarClock className="size-3.5" aria-hidden /> Forecast closer to the date
      </span>
    )
  }

  const Icon = ICONS[weather.icon?.slice(0, 2)] ?? LuCloudSun
  const wet = weather.rain_chance >= 50
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${wet ? 'bg-sky-100 text-sky-900' : 'bg-amber-50 text-amber-900'}`}
      title={`${weather.description}, wind up to ${weather.max_wind_kmh} km/h`}
    >
      <Icon className="size-3.5" aria-hidden />
      {weather.min_temp}-{weather.max_temp}°C
      {weather.rain_chance > 0 && <span className="opacity-75">&middot; {weather.rain_chance}% rain</span>}
    </span>
  )
}

export default WeatherBadge
