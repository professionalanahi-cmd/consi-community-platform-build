import type { Metadata } from 'next'
import { ResultsView } from '@/components/consi/results/results-view'

export const metadata: Metadata = { title: 'Results — CONSI' }

export default function ResultsPage() {
  return <ResultsView />
}
