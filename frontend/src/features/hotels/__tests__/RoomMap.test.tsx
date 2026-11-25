import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RoomMap } from '../components/RoomMap'
import type { FloorData, NightAvailability } from '../types'

const floors: FloorData[] = [
  {
    floor: 2,
    rooms: [
      { id: 201, roomNo: '201', roomType: 'STANDARD', capacity: 2, pricePerNight: 3400, status: 'AVAILABLE' },
      { id: 202, roomNo: '202', roomType: 'DELUXE',   capacity: 3, pricePerNight: 4600, status: 'BOOKED' },
      { id: 203, roomNo: '203', roomType: 'SUITE',    capacity: 4, pricePerNight: 6800, status: 'AVAILABLE' },
      { id: 204, roomNo: '204', roomType: 'DELUXE',   capacity: 3, pricePerNight: 4600, status: 'HELD' },
    ],
  },
  {
    floor: 3,
    rooms: [
      { id: 301, roomNo: '301', roomType: 'STANDARD', capacity: 2, pricePerNight: 3400, status: 'AVAILABLE' },
    ],
  },
]

const dateStrip: NightAvailability[] = [
  { date: '2026-10-31', available: 6, total: 10 },
  { date: '2026-11-01', available: 2, total: 10 },
  { date: '2026-11-02', available: 0, total: 10 },
]

describe('RoomMap', () => {
  it('renders room buttons with correct aria-labels', () => {
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Room 201, Standard, available/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Room 202, Deluxe, booked/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Room 204, Deluxe, held/i }),
    ).toBeInTheDocument()
  })

  it('calls onRoomSelect when an available room is clicked', () => {
    const onSelect = vi.fn()
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
        onRoomSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Room 201, Standard, available/i }))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 201, roomNo: '201' }),
    )
  })

  it('does not call onRoomSelect when a booked room is clicked', () => {
    const onSelect = vi.fn()
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
        onRoomSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Room 202, Deluxe, booked/i }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows selected room with aria-pressed=true', () => {
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
        selectedRoomId={201}
      />,
    )
    const btn = screen.getByRole('button', { name: /Room 201, Standard, available.*selected/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows floor tabs and switches floors on click', () => {
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Floor 2' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Floor 3' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Floor 3' }))
    expect(screen.getByRole('button', { name: /Room 301/i })).toBeInTheDocument()
  })

  it('shows "Sold out" for nights with zero availability', () => {
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={10}
        availableTonight={6}
      />,
    )
    expect(screen.getByText('Sold out')).toBeInTheDocument()
  })

  it('keyboard Enter selects an available room', () => {
    const onSelect = vi.fn()
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
        onRoomSelect={onSelect}
      />,
    )
    const btn = screen.getByRole('button', { name: /Room 201, Standard, available/i })
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 201 }),
    )
  })

  it('keyboard Space selects an available room', () => {
    const onSelect = vi.fn()
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
        onRoomSelect={onSelect}
      />,
    )
    const btn = screen.getByRole('button', { name: /Room 203, Suite, available/i })
    fireEvent.keyDown(btn, { key: ' ' })
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 203 }),
    )
  })

  it('shows availability summary line', () => {
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={10}
        availableTonight={3}
      />,
    )
    expect(screen.getByText(/3 of 10 rooms available tonight/)).toBeInTheDocument()
  })

  it('shows legend with all four status types', () => {
    render(
      <RoomMap
        floors={floors}
        dateStrip={dateStrip}
        totalRooms={5}
        availableTonight={3}
      />,
    )
    const legend = screen.getByRole('generic', { name: /Room status legend/i })
    expect(legend).toBeInTheDocument()
    expect(legend.textContent).toContain('Available')
    expect(legend.textContent).toContain('Booked')
    expect(legend.textContent).toContain('Held')
    expect(legend.textContent).toContain('Selected')
  })
})
