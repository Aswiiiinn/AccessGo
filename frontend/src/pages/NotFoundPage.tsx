import { Compass } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="ag-page ag-page-narrow">
      <h1 className="visually-hidden">Page not found</h1>
      <div className="ag-card mt-lg-4">
        <EmptyState
          icon={Compass}
          headingLevel={2}
          title="We couldn't find that page"
          description="The link may be broken, or the page may have moved."
          action={{ label: 'Go to the journey planner', to: '/' }}
        />
      </div>
    </div>
  )
}
