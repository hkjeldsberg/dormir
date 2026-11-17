import { LogsProvider } from '@/components/LogsProvider'
import { Shell } from '@/components/Shell'
import { listLogs } from '@/lib/logs'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const logs = await listLogs()
  return (
    <LogsProvider initial={logs} childName={process.env.CHILD_NAME || 'Child'}>
      <Shell>{children}</Shell>
    </LogsProvider>
  )
}
