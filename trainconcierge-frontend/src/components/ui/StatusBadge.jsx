const STATUS_STYLES = {
  // Train statuses
  ON_TIME: 'badge-green',
  DELAYED: 'badge-yellow',
  CANCELLED: 'badge-red',
  // Booking statuses
  CONFIRMED: 'badge-green',
  REBOOKED: 'badge-blue',
  COMPLETED: 'badge-gray',
  // Alert statuses
  ACTIVE: 'badge-blue',
  TRIGGERED: 'badge-green',
  // Reservation statuses
  PENDING: 'badge-yellow'
}

export default function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'badge-gray'
  return <span className={cls}>{status?.replace('_', ' ')}</span>
}
