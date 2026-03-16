import { ErrorBoundary } from './components/ErrorBoundary'
import { AppShell } from './app/shell/AppShell'

function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}

export default App
