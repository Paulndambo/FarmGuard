import type { ReactNode } from 'react'
import type { AppView, User } from '../types'

type WorkspaceShellProps = {
  user: User
  view: AppView
  selectedFarmId: string | null
  displayName: string
  statusMessage: string
  errorMessage: string
  children: ReactNode
  onSetView: (view: AppView) => void
  onRefresh: () => void
  onLogout: () => void
}

function getPageTitle(view: AppView) {
  if (view === 'history') return 'History'
  if (view === 'farm-detail') return 'Farm detail'
  return 'Dashboard'
}

function WorkspaceShell({
  user,
  view,
  selectedFarmId,
  displayName,
  statusMessage,
  errorMessage,
  children,
  onSetView,
  onRefresh,
  onLogout,
}: WorkspaceShellProps) {
  return (
    <main className="app-shell workspace-shell">
      <aside className="sidebar">
        <div className="brand-row sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            FG
          </div>
          <span>FarmGuard AI</span>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <button
            type="button"
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => onSetView('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={view === 'farm-detail' ? 'active' : ''}
            onClick={() => {
              if (selectedFarmId) onSetView('farm-detail')
            }}
            disabled={!selectedFarmId}
          >
            Farm detail
          </button>
          <button
            type="button"
            className={view === 'history' ? 'active' : ''}
            onClick={() => onSetView('history')}
          >
            History
          </button>
        </nav>

        <div className="account-block">
          <span>{displayName}</span>
          <small>{user.email || user.username}</small>
        </div>
        <button className="ghost-button full-width" type="button" onClick={onLogout}>
          Sign out
        </button>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">FarmGuard AI</div>
            <h1>{getPageTitle(view)}</h1>
          </div>
          <button className="ghost-button" type="button" onClick={onRefresh}>
            Refresh
          </button>
        </header>

        {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {children}
      </section>
    </main>
  )
}

export default WorkspaceShell
