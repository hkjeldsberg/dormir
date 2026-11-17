import { listLogs } from '@/lib/logs'
import { toCsv } from '@/lib/csv'

export async function GET() {
  const csv = toCsv(await listLogs())
  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dormir-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
