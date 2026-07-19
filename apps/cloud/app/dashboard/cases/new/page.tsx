import { Suspense } from 'react'
import { NewCaseForm } from './new-case-form'

export default function NewCasePage() {
  return (
    <Suspense fallback={<div>Loading new case form...</div>}>
      <NewCaseForm />
    </Suspense>
  )
}
