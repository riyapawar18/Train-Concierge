import { useState } from 'react'
import type { FloorData, NightAvailability, RoomData } from '../types'
import { cn } from '@/lib/utils'

interface RoomMapProps {
  floors: FloorData[]
  dateStrip: NightAvailability[]
  totalRooms: number
  availableTonight: number
  selectedRoomId?: number | null
  onRoomSelect?: (room: RoomData) => void
  checkIn?: string
  checkOut?: string
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUITE: 'Suite',
}

function statusLabel(status: RoomData['status']): string {
  switch (status) {
    case 'AVAILABLE': return 'available'
    case 'BOOKED': return 'booked'
    case 'HELD': return 'held'
  }
}

function roomButtonClass(status: RoomData['status'], selected: boolean): string {
  if (selected) return 'bg-brand-navy text-white border-brand-navy ring-2 ring-brand-navy'
  switch (status) {
    case 'AVAILABLE':
      return 'bg-white border-border text-text hover:border-brand-navy hover:bg-surface-muted cursor-pointer'
    case 'BOOKED':
      return 'bg-surface border-border text-muted cursor-not-allowed opacity-60'
    case 'HELD':
      return 'bg-warning-soft border-warning text-warning cursor-not-allowed opacity-70'
  }
}

/**
 * Room floor map with ARIA labels, floor tabs and a legend.
 * Keyboard navigable: Enter/Space to select an available room.
 */
export function RoomMap({
  floors,
  dateStrip,
  totalRooms,
  availableTonight,
  selectedRoomId,
  onRoomSelect,
  checkIn,
  checkOut,
}: RoomMapProps) {
  const [activeFloor, setActiveFloor] = useState<number>(floors[0]?.floor ?? 1)

  const currentFloorData = floors.find((f) => f.floor === activeFloor)

  function handleRoomClick(room: RoomData) {
    if (room.status !== 'AVAILABLE') return
    onRoomSelect?.(room)
  }

  function handleRoomKeyDown(e: React.KeyboardEvent, room: RoomData) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleRoomClick(room)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 text-xs text-muted"
        aria-label="Room status legend"
      >
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-border bg-white" aria-hidden="true" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-border bg-surface opacity-60" aria-hidden="true" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-warning bg-warning-soft" aria-hidden="true" />
          Held
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border-2 border-brand-navy bg-brand-navy" aria-hidden="true" />
          Selected
        </span>
      </div>

      {/* Floor tabs */}
      {floors.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Floor selection">
          {floors.map((f) => (
            <button
              key={f.floor}
              role="tab"
              aria-selected={activeFloor === f.floor}
              aria-controls={`floor-panel-${f.floor}`}
              onClick={() => setActiveFloor(f.floor)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                activeFloor === f.floor
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-border bg-white text-muted hover:border-brand-navy',
              )}
            >
              Floor {f.floor}
            </button>
          ))}
        </div>
      )}

      {/* Room grid */}
      {currentFloorData && (
        <div
          id={`floor-panel-${activeFloor}`}
          role="tabpanel"
          aria-label={`Floor ${activeFloor} rooms`}
        >
          <div className="flex flex-wrap gap-2">
            {currentFloorData.rooms.map((room) => {
              const isSelected = selectedRoomId === room.id
              const isAvailable = room.status === 'AVAILABLE'
              return (
                <button
                  key={room.id}
                  aria-label={`Room ${room.roomNo}, ${ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}, ${statusLabel(room.status)}${isSelected ? ', selected' : ''}`}
                  aria-pressed={isSelected}
                  aria-disabled={!isAvailable}
                  tabIndex={isAvailable ? 0 : -1}
                  onClick={() => handleRoomClick(room)}
                  onKeyDown={(e) => handleRoomKeyDown(e, room)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all',
                    roomButtonClass(room.status, isSelected),
                    !isAvailable && 'pointer-events-none',
                  )}
                >
                  <div className="font-semibold">{room.roomNo}</div>
                  <div className="text-[10px] opacity-80">
                    {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-muted">
        {availableTonight} of {totalRooms} rooms available tonight
      </p>

      {/* Date strip */}
      {dateStrip.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-max text-xs">
            <caption className="sr-only">Room availability by night</caption>
            <thead>
              <tr>
                <th className="pr-3 text-left font-medium text-muted">Availability</th>
                {dateStrip.map((n) => (
                  <th
                    key={n.date}
                    scope="col"
                    className="px-2 text-center font-medium text-text"
                  >
                    {formatDateStrip(n.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-3 text-muted">Rooms left</td>
                {dateStrip.map((n) => (
                  <td
                    key={n.date}
                    className={cn(
                      'px-2 text-center font-semibold tabular-nums',
                      n.available === 0
                        ? 'text-danger'
                        : n.available <= 3
                          ? 'text-warning'
                          : 'text-text',
                    )}
                  >
                    {n.available === 0 ? 'Sold out' : n.available}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {checkIn && checkOut && (
        <p className="text-xs text-muted">
          Showing availability from {checkIn} to {checkOut}. All nights must be free to book.
        </p>
      )}
    </div>
  )
}

function formatDateStrip(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
}
