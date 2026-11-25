import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { SearchValues } from '../types'
import { buildRouteParams, routeFromValues, SEARCH_PATH } from '../searchParams'
import { ChartsVacancyPanel } from './ChartsVacancyPanel'
import { PnrStatusPanel } from './PnrStatusPanel'
import { SearchForm } from './SearchForm'

interface BookTicketCardProps {
  defaultTab?: 'book' | 'pnr' | 'charts'
  onSearch?: (values: SearchValues) => void
  className?: string
}

function BookTicketCard({ defaultTab = 'book', onSearch, className }: BookTicketCardProps) {
  const navigate = useNavigate()

  const handleSearch = (values: SearchValues) => {
    if (onSearch) {
      onSearch(values)
      return
    }
    const params = buildRouteParams(routeFromValues(values))
    navigate(`${SEARCH_PATH}?${params.toString()}`)
  }

  return (
    <Card className={cn('overflow-visible', className)}>
      <CardContent className="p-4 sm:p-5">
        <Tabs defaultValue={defaultTab}>
          <TabsList aria-label="Ticket tools" className="w-full flex-wrap justify-start">
            <TabsTrigger value="book">Book Ticket</TabsTrigger>
            <TabsTrigger value="pnr">PNR Status</TabsTrigger>
            <TabsTrigger value="charts">Charts / Vacancy</TabsTrigger>
          </TabsList>

          <TabsContent value="book">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight text-text">
                Book a train ticket
              </h2>
              <p className="text-sm text-muted">
                Search by route and date, then compare fares, quotas and seat availability.
              </p>
            </div>
            <SearchForm onSearch={handleSearch} idPrefix="book-ticket" />
          </TabsContent>

          <TabsContent value="pnr">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight text-text">Check a PNR</h2>
              <p className="text-sm text-muted">
                Look up the booking status for a 10-digit PNR number.
              </p>
            </div>
            <PnrStatusPanel />
          </TabsContent>

          <TabsContent value="charts">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight text-text">Charts / Vacancy</h2>
              <p className="text-sm text-muted">
                Compare seats left in every class, then open a coach chart and seat map.
              </p>
            </div>
            <ChartsVacancyPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export { BookTicketCard, type BookTicketCardProps }
