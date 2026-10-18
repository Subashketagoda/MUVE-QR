import React from 'react'
import { PublicCheckpointForm } from '@/components/public/PublicCheckpointForm'

interface ScanTokenPageProps {
  params: Promise<{ token: string }>
}

export default async function ScanTokenPage({ params }: ScanTokenPageProps) {
  const { token } = await params

  return <PublicCheckpointForm token={token} />
}
