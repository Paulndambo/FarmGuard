import type { FormEvent } from 'react'
import { cropOptions } from '../constants'
import { formatDate, levelClass, titleCase } from '../formatters'
import type { DashboardData, FarmForm } from '../types'

type DashboardViewProps = {
  dashboard: DashboardData | null
  farmForm: FarmForm
  editingFarmId: string | null
  isLoadingDashboard: boolean
  actionLoading: string
  onChangeFarmForm: (form: FarmForm) => void
  onSubmitFarm: (event: FormEvent<HTMLFormElement>) => void
  onResetFarmForm: () => void
  onOpenFarm: (farmId: string) => void
  onDeleteFarm: (farmId: string) => void
}

function DashboardView({
  dashboard,
  farmForm,
  editingFarmId,
  isLoadingDashboard,
  actionLoading,
  onChangeFarmForm,
  onSubmitFarm,
  onResetFarmForm,
  onOpenFarm,
  onDeleteFarm,
}: DashboardViewProps) {
  const summary = dashboard?.summary

  return (
    <div className="view-stack">
      <section className="metric-grid">
        <Metric label="Total farms" value={summary?.total_farms ?? 0} tone="neutral" />
        <Metric label="High risk" value={summary?.high_risk_farms ?? 0} tone="danger" />
        <Metric label="Medium risk" value={summary?.medium_risk_farms ?? 0} tone="warning" />
        <Metric label="Low risk" value={summary?.low_risk_farms ?? 0} tone="success" />
        <Metric label="Unknown" value={summary?.unknown_risk_farms ?? 0} tone="muted" />
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Farms</span>
              <h2>Monitoring list</h2>
            </div>
            {isLoadingDashboard ? <span className="loading-chip">Loading</span> : null}
          </div>

          {dashboard?.farms.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Farm</th>
                    <th>Crop</th>
                    <th>Acres</th>
                    <th>Risk</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.farms.map((farm) => (
                    <tr key={farm.id}>
                      <td>
                        <strong>{farm.name}</strong>
                        <span>{farm.county}</span>
                      </td>
                      <td>{titleCase(farm.crop_type)}</td>
                      <td>{farm.land_acres}</td>
                      <td>
                        <span className={levelClass(farm.latest_risk_level)}>
                          {farm.latest_risk_level}
                        </span>
                      </td>
                      <td>{formatDate(farm.updated_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => onOpenFarm(farm.id)}>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteFarm(farm.id)}
                            disabled={actionLoading === `delete-${farm.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No farms yet</h3>
              <p>Create your first farm profile to start weather and risk monitoring.</p>
            </div>
          )}
        </div>

        <FarmFormPanel
          farmForm={farmForm}
          editingFarmId={editingFarmId}
          actionLoading={actionLoading}
          onChangeFarmForm={onChangeFarmForm}
          onSubmitFarm={onSubmitFarm}
          onResetFarmForm={onResetFarmForm}
        />
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'neutral' | 'danger' | 'warning' | 'success' | 'muted'
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type FarmFormPanelProps = {
  farmForm: FarmForm
  editingFarmId: string | null
  actionLoading: string
  onChangeFarmForm: (form: FarmForm) => void
  onSubmitFarm: (event: FormEvent<HTMLFormElement>) => void
  onResetFarmForm: () => void
}

function FarmFormPanel({
  farmForm,
  editingFarmId,
  actionLoading,
  onChangeFarmForm,
  onSubmitFarm,
  onResetFarmForm,
}: FarmFormPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-label">{editingFarmId ? 'Edit farm' : 'Create farm'}</span>
          <h2>{editingFarmId ? 'Update profile' : 'New farm profile'}</h2>
        </div>
      </div>

      <form className="data-form" onSubmit={onSubmitFarm}>
        <label>
          Farm name
          <input
            value={farmForm.name}
            onChange={(event) => onChangeFarmForm({ ...farmForm, name: event.target.value })}
            required
          />
        </label>
        <div className="form-grid two-column">
          <label>
            County
            <input
              value={farmForm.county}
              onChange={(event) => onChangeFarmForm({ ...farmForm, county: event.target.value })}
              required
            />
          </label>
          <label>
            Crop
            <select
              value={farmForm.crop_type}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, crop_type: event.target.value })
              }
            >
              {cropOptions.map((crop) => (
                <option key={crop} value={crop}>
                  {titleCase(crop)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid three-column">
          <label>
            Latitude
            <input
              type="number"
              step="0.0000001"
              value={farmForm.latitude}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, latitude: event.target.value })
              }
              required
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="0.0000001"
              value={farmForm.longitude}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, longitude: event.target.value })
              }
              required
            />
          </label>
          <label>
            Acres
            <input
              type="number"
              step="0.01"
              min="0"
              value={farmForm.land_acres}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, land_acres: event.target.value })
              }
            />
          </label>
        </div>
        <label>
          Notes
          <textarea
            value={farmForm.notes}
            onChange={(event) => onChangeFarmForm({ ...farmForm, notes: event.target.value })}
            rows={4}
          />
        </label>
        <div className="button-row">
          <button className="primary-button" type="submit" disabled={actionLoading === 'farm-save'}>
            {actionLoading === 'farm-save'
              ? 'Saving...'
              : editingFarmId
                ? 'Save changes'
                : 'Create farm'}
          </button>
          {editingFarmId ? (
            <button className="ghost-button" type="button" onClick={onResetFarmForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

export default DashboardView
