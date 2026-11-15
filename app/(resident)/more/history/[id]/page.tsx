import { HistoryDetailView } from '@/components/consi/history/history-detail-view'

export const metadata = { title: 'Past search · CONSI' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <HistoryDetailView id={id} />
}
