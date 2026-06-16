import { formatDate } from '../formatters'
import type { AIInsight, RiskAssessment, WeatherSnapshot } from '../types'

type HistoryViewProps = {
  isLoading: boolean
  weatherHistory: WeatherSnapshot[]
  riskHistory: RiskAssessment[]
  insightHistory: AIInsight[]
}

function HistoryView({
  isLoading,
  weatherHistory,
  riskHistory,
  insightHistory,
}: HistoryViewProps) {
  return (
    <div className="view-stack">
      {isLoading ? <div className="panel muted-panel">Loading history...</div> : null}
      <section className="history-grid">
        <HistoryPanel title="Weather snapshots" items={weatherHistory} />
        <HistoryPanel title="Risk assessments" items={riskHistory} />
        <HistoryPanel title="AI insights" items={insightHistory} />
      </section>
    </div>
  )
}

function HistoryPanel({
  title,
  items,
}: {
  title: string
  items: Array<WeatherSnapshot | RiskAssessment | AIInsight>
}) {
  return (
    <div className="panel history-panel">
      <div className="panel-header">
        <div>
          <span className="panel-label">History</span>
          <h2>{title}</h2>
        </div>
        <span className="count-chip">{items.length}</span>
      </div>
      {items.length ? (
        <div className="history-list">
          {items.slice(0, 8).map((item) => (
            <article key={item.id}>
              <strong>{'level' in item ? item.level : 'model' in item ? item.model : item.source}</strong>
              <span>{formatDate(item.created_at)}</span>
              {'score' in item ? <p>Score {item.score}</p> : null}
              {'response' in item ? <p>{item.response.slice(0, 150)}</p> : null}
              {'current_temperature' in item ? (
                <p>Current temp {item.current_temperature ?? '--'}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-text">No records yet.</p>
      )}
    </div>
  )
}

export default HistoryView
