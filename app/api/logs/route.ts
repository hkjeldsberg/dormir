import { NextResponse, type NextRequest } from 'next/server'
import { listLogs, upsertLog, deleteLog } from '@/lib/logs'
import { validateLogInput } from '@/lib/validate'

export async function GET() {
  try {
    return NextResponse.json(await listLogs())
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const result = validateLogInput(body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  try {
    return NextResponse.json(await upsertLog(result.value))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  try {
    await deleteLog(date)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
