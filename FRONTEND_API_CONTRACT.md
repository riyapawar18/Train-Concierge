# TrainConcierge – Frontend / Backend API Contract

> Backend: Spring Boot 3.3.4 · Port 8080  
> Frontend: React 18 + Vite · Port 5173  
> Auth: JWT Bearer token (24 h TTL)  
> All endpoints return `{ success, message?, data?, error? }`

---

## Authentication

### POST `/api/auth/register`
**Body:**
```json
{ "username": "string", "password": "string", "email": "string", "fullName": "string", "role": "PASSENGER|ADMIN" }
```
**Response `data`:**
```json
{ "token": "string", "username": "string", "email": "string", "fullName": "string", "role": "PASSENGER|ADMIN", "userId": 1 }
```

### POST `/api/auth/login`
**Body:** `{ "username": "string", "password": "string" }`  
**Response `data`:** Same as register  
**Errors:** 401 on bad credentials

---

## Trains

### GET `/api/trains/search` *(public)*
**Params:** `from`, `to`, `date` (YYYY-MM-DD), `seats` (int, default 1)  
**Response `data`:** `TrainDto[]`

### GET `/api/trains/{id}` *(public)*
**Response `data`:** `TrainDto`

### GET `/api/trains/{id}/alternatives` *(auth)*
**Response `data`:** `TrainDto[]` — same route/date, excluding the given train

### GET `/api/trains` *(admin only)*
**Response `data`:** `TrainDto[]` — all trains

**TrainDto fields:**
```
id, trainNumber, trainName, fromStation, toStation, travelDate,
departureTime, arrivalTime, totalSeats, availableSeats, price,
status (ON_TIME|DELAYED|CANCELLED), delayMinutes, cancellationReason
```

---

## Bookings *(all require Bearer token)*

### POST `/api/bookings`
**Body:** `{ "trainId": 1, "numberOfSeats": 2 }`  
**Response `data`:** `BookingDto`  
**Errors:** 400 if train cancelled or insufficient seats

### GET `/api/bookings`
Returns all bookings for the authenticated user, newest first.

### GET `/api/bookings/{id}`
Returns booking by ID. Returns 400 if not owned by current user.

### PATCH `/api/bookings/{id}/cancel`
Cancels booking, restores seats, sends BOOKING_CANCELLED notification.

### POST `/api/bookings/rebook`
**Body:** `{ "originalBookingId": 1, "newTrainId": 2, "numberOfSeats": 2 }`  
- Marks original as `REBOOKED`  
- Creates new `CONFIRMED` booking  
- `originalBookingId` field links history  
- Sends `REBOOKING_CONFIRMED` notification

**BookingDto fields:**
```
id, userId, username, trainId, trainNumber, trainName,
fromStation, toStation, travelDate, departureTime, arrivalTime,
numberOfSeats, totalAmount, status (CONFIRMED|CANCELLED|REBOOKED|COMPLETED),
bookedAt, cancelledAt, cancellationReason, originalBookingId,
trainStatus, trainDelayMinutes
```

---

## Hotels *(require Bearer token)*

### POST `/api/hotels`
**Body:**
```json
{
  "bookingId": 1, "hotelName": "Taj Palace", "city": "Delhi",
  "checkIn": "2026-10-21", "checkOut": "2026-10-23",
  "rooms": 1, "pricePerNight": 3000
}
```
**Response `data`:** `HotelDto` with `totalAmount = pricePerNight × nights × rooms`

### GET `/api/hotels`  
All hotel reservations for current user.

### GET `/api/hotels/booking/{bookingId}`  
Hotels linked to a specific booking.

### DELETE `/api/hotels/{id}`  
Cancels hotel reservation.

---

## Cabs *(require Bearer token)*

### POST `/api/cabs`
**Body:**
```json
{
  "bookingId": 1, "cabType": "Sedan", "pickupLocation": "Delhi Station",
  "dropLocation": "Connaught Place", "pickupDate": "2026-10-21",
  "pickupTime": "10:00", "fare": 500
}
```

### GET `/api/cabs`  
### GET `/api/cabs/booking/{bookingId}`  
### DELETE `/api/cabs/{id}`

---

## Seat Alerts *(require Bearer token)*

### POST `/api/seat-alerts`
**Body:**
```json
{ "fromStation": "Mumbai", "toStation": "Delhi", "travelDate": "2026-10-21", "seatsRequired": 2 }
```
Alert is checked immediately on creation. If seats available, status = `TRIGGERED` and `SEAT_AVAILABLE` notification sent.

### GET `/api/seat-alerts`  
All alerts for current user (ACTIVE / TRIGGERED / CANCELLED).

### DELETE `/api/seat-alerts/{id}`  
Sets status to `CANCELLED`.

---

## Notifications *(require Bearer token)*

### GET `/api/notifications`  
All notifications newest-first. Fields: `id, title, message, type, isRead, createdAt, bookingId`

### GET `/api/notifications/unread-count`  
Returns `{ "count": N }`

### PATCH `/api/notifications/mark-all-read`

### PATCH `/api/notifications/{id}/read`

**Notification types:**
`BOOKING_CONFIRMED, BOOKING_CANCELLED, TRAIN_DELAYED, TRAIN_CANCELLED,
SEAT_AVAILABLE, ALTERNATIVE_SUGGESTED, REBOOKING_CONFIRMED,
HOTEL_CONFIRMED, CAB_CONFIRMED, GENERAL`

---

## Admin Endpoints *(require ADMIN role)*

### GET `/api/admin/stats`
Returns `{ totalBookings, confirmedBookings, totalUsers, totalTrains }`

### GET `/api/admin/bookings`  
All bookings across all users.

### POST `/api/admin/trains`  
**Body:** `TrainDto` (without id)

### PUT `/api/admin/trains/{id}`  
Full train update.

### DELETE `/api/admin/trains/{id}`

### POST `/api/admin/disruptions`
**Body:**
```json
{ "trainId": 1, "type": "DELAY|CANCEL", "delayMinutes": 45, "reason": "Fog" }
```
- Sends `TRAIN_DELAYED` or `TRAIN_CANCELLED` notification to all confirmed passengers  
- For CANCEL: also sends `ALTERNATIVE_SUGGESTED` if alternatives exist

### POST `/api/admin/disruptions/{trainId}/reset`  
Resets train to `ON_TIME`, clears `delayMinutes` and `cancellationReason`.

---

## Error Response Format

All errors return the wrapper with `success: false`:
```json
{ "success": false, "error": "Error message here" }
```
HTTP status codes:
- 400 – validation or business rule failure  
- 401 – missing/invalid JWT  
- 403 – insufficient role  
- 500 – unexpected server error

---

## Frontend Axios Config

```js
// src/services/api.js
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tc_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
  }
  return Promise.reject(err)
})
```

## Token Storage

| Key | Value |
|-----|-------|
| `tc_token` | Raw JWT string |
| `tc_user` | JSON object: `{ username, email, fullName, role, userId }` |

---

*Generated: 2026-10-19 · TrainConcierge v1.0.0*
