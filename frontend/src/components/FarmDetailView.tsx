import { parseAdvisorySections } from '../advisory'
import { asNumber, formatDate, levelClass, titleCase } from '../formatters'
import type { AIInsight, AlertPreview, Farm, RiskAssessment, WeatherResponse } from '../types'

type FarmDetailViewProps = {
  farm: Farm | null
  weather: WeatherResponse | null
  risk: RiskAssessment | null
  insight: AIInsight | null
  alertPreview: AlertPreview | null
  actionLoading: string
  isLoadingDetail: boolean
  onEditFarm: (farm: Farm) => void
  onFetchWeather: (refresh: boolean) => void
  onGenerateRisk: () => void
  onGenerateInsight: () => void
  onFetchAlertPreview: () => void
}

function FarmDetailView({
  farm,
  weather,
  risk,
  insight,
  alertPreview,
  actionLoading,
  isLoadingDetail,
  onEditFarm,
  onFetchWeather,
  onGenerateRisk,
  onGenerateInsight,
  onFetchAlertPreview,
}: FarmDetailViewProps) {
  if (isLoadingDetail) return <div className="panel muted-panel">Loading farm detail...</div>
  if (!farm) return <div className="panel muted-panel">Select a farm from the dashboard.</div>

  const latestRiskLevel = risk?.level ?? farm.latest_risk_level
  const latestRiskScore = risk?.score ?? farm.latest_risk_score

  return (
    <div className="view-stack">
      <section className="detail-hero">
        <div>
          <span className="panel-label">{farm.county}</span>
          <h2>{farm.name}</h2>
          <p>
            {titleCase(farm.crop_type)} farm, {farm.land_acres} acres. Coordinates {farm.latitude},{' '}
            {farm.longitude}.
          </p>
        </div>
        <div className="detail-actions">
          <span className={levelClass(latestRiskLevel)}>{latestRiskLevel}</span>
          <button className="ghost-button" type="button" onClick={() => onEditFarm(farm)}>
            Edit farm
          </button>
        </div>
      </section>

      <section className="process-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Weather</span>
              <h2>Forecast snapshot</h2>
            </div>
            <div className="button-row compact">
              <button
                type="button"
                onClick={() => onFetchWeather(false)}
                disabled={actionLoading === 'weather'}
              >
                {actionLoading === 'weather' ? 'Fetching...' : 'Fetch'}
              </button>
              <button
                type="button"
                onClick={() => onFetchWeather(true)}
                disabled={actionLoading === 'weather-refresh'}
              >
                Refresh
              </button>
            </div>
          </div>
          {weather ? (
            <WeatherPanel weather={weather} />
          ) : (
            <p className="muted-text">Fetch weather before generating risk.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Risk</span>
              <h2>Assessment</h2>
            </div>
            <button type="button" onClick={onGenerateRisk} disabled={actionLoading === 'risk'}>
              {actionLoading === 'risk' ? 'Generating...' : 'Generate risk'}
            </button>
          </div>
          <div className="risk-score">
            <strong>{Math.round(latestRiskScore)}</strong>
            <span className={levelClass(latestRiskLevel)}>{latestRiskLevel}</span>
          </div>
          {risk ? (
            <InsightLists drivers={risk.drivers} actions={risk.recommended_actions} />
          ) : (
            <p className="muted-text">Risk details will appear after generation.</p>
          )}
        </div>
      </section>

      <section className="process-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">AI advisory</span>
              <h2>Gemini insight</h2>
            </div>
            <button
              type="button"
              onClick={onGenerateInsight}
              disabled={actionLoading === 'insight'}
            >
              {actionLoading === 'insight' ? 'Generating...' : 'Generate insight'}
            </button>
          </div>
          {insight ? (
            <AdvisoryResponse text={insight.response} />
          ) : (
            <p className="muted-text">Generate risk first, then request a farmer-ready advisory.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Alert</span>
              <h2>Preview</h2>
            </div>
            <button type="button" onClick={onFetchAlertPreview} disabled={actionLoading === 'alert'}>
              {actionLoading === 'alert' ? 'Loading...' : 'Preview alert'}
            </button>
          </div>
          {alertPreview ? (
            <div className="alert-preview">
              <span className="mode-chip">{alertPreview.mode}</span>
              <dl>
                <div>
                  <dt>To</dt>
                  <dd>{alertPreview.to}</dd>
                </div>
                <div>
                  <dt>Message</dt>
                  <dd>{alertPreview.message}</dd>
                </div>
              </dl>
              {alertPreview.latest_ai_insight ? (
                <details>
                  <summary>AI insight attached</summary>
                  <AdvisoryResponse text={alertPreview.latest_ai_insight} compact />
                </details>
              ) : null}
            </div>
          ) : (
            <p className="muted-text">Preview the simulated SMS after a risk assessment exists.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function AdvisoryResponse({ text, compact = false }: { text: string; compact?: boolean }) {
  const sections = parseAdvisorySections(text)

  return (
    <div className={compact ? 'advisory-sections compact-advisory' : 'advisory-sections'}>
      {sections.map((section) => (
        <article key={section.title}>
          <div className="advisory-heading">
            <span>{section.number}</span>
            <h3>{section.label}</h3>
          </div>
          <div>
            {section.body.split('\n').map((line) =>
              line.startsWith('- ') ? (
                <p className="advisory-bullet" key={line}>
                  {line.slice(2)}
                </p>
              ) : line ? (
                <p key={line}>{line}</p>
              ) : null,
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function WeatherPanel({ weather }: { weather: WeatherResponse }) {
  const snapshot = weather.snapshot
  const daily = snapshot.raw_response.daily ?? {}
  const days = Array.isArray(daily.time) ? daily.time.slice(0, 7) : []
  const maxTemps = Array.isArray(daily.temperature_2m_max)
    ? daily.temperature_2m_max.slice(0, 7)
    : []
  const rain = Array.isArray(daily.rain_sum)
    ? daily.rain_sum.slice(0, 7)
    : Array.isArray(daily.precipitation_sum)
      ? daily.precipitation_sum.slice(0, 7)
      : []

  return (
    <div className="weather-stack">
      <div className="weather-metrics">
        <MetricValue label="Current" value={snapshot.current_temperature} suffix="deg" />
        <MetricValue label="Max temp" value={snapshot.max_temperature} suffix="deg" />
        <MetricValue label="Min temp" value={snapshot.min_temperature} suffix="deg" />
        <MetricValue label="Rain" value={snapshot.max_rainfall} suffix="mm" />
        <MetricValue label="Wind" value={snapshot.max_wind_speed} suffix="km/h" />
      </div>
      <p className="muted-text">
        {weather.cached ? 'Cached snapshot' : 'Fresh snapshot'} from {snapshot.source}, captured{' '}
        {formatDate(snapshot.created_at)}.
      </p>
      {days.length ? (
        <div className="forecast-bars" aria-label="Daily forecast">
          {days.map((day, index) => {
            const temp = asNumber(maxTemps[index])
            const rainfall = asNumber(rain[index])
            return (
              <div key={String(day)} className="forecast-day">
                <span>{String(day).slice(5)}</span>
                <div className="bar-row">
                  <i style={{ height: `${Math.max((temp ?? 0) * 2, 8)}px` }} />
                  <b style={{ height: `${Math.max((rainfall ?? 0) * 3, 8)}px` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function MetricValue({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | null
  suffix: string
}) {
  return (
    <div className="weather-value">
      <span>{label}</span>
      <strong>
        {value ?? '--'} <small>{value === null ? '' : suffix}</small>
      </strong>
    </div>
  )
}

function InsightLists({ drivers, actions }: { drivers: string[]; actions: string[] }) {
  return (
    <div className="insight-lists">
      <section className="insight-card-group">
        <h3>Drivers</h3>
        <div className="action-card-list">
          {drivers.map((driver, index) => (
            <article className="action-card driver-card" key={driver}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{driver}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="insight-card-group">
        <h3>Recommended actions</h3>
        <div className="action-card-list">
          {actions.map((action, index) => (
            <article className="action-card recommendation-card" key={action}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{action}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default FarmDetailView
