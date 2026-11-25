import { api } from '@/lib/apiClient'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalPassengers: number
  activeJourneys: number
  activeDisruptions: number
  passengersAffected: number
  rebooked: number
  notificationsSentToday: number
  hotelStaysAtRisk: number
}

export interface DelayTrendPoint {
  date: string
  disruptionCount: number
  avgDelayMinutes: number
}

export interface AuditLogEntry {
  id: number
  actorUserId: number | null
  action: string
  targetType: string | null
  targetId: number | null
  details: string | null
  createdAt: string
}

export interface PassengerSummary {
  id: number
  fullName: string
  email: string
  mobile: string | null
  journeyCount: number
  enabled: boolean
  createdAt: string
}

export interface PassengerDetail {
  summary: PassengerSummary
  journeyCount: number
  hotelBookings: number
  recentNotifications: NotificationAdminEntry[]
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface JourneyAdminSummary {
  id: number
  userId: number
  pnr: string
  trainName: string
  trainNumber: string
  travelDate: string
  fromName: string
  toName: string
  status: string
  flagged: boolean
  createdAt: string
}

export interface ExtensionRequestAdminEntry {
  id: number
  hotelBookingId: number
  type: string
  status: string
  feeEstimate: number | null
  responseNote: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface NotificationAdminEntry {
  id: number
  userId: number
  type: string
  title: string
  channel: string
  deliveryStatus: string
  deliveryError: string | null
  createdAt: string
}

export interface UserRoleEntry {
  id: number
  fullName: string
  email: string
  role: string
  enabled: boolean
  createdAt: string
}

export interface ReportData {
  name: string
  headers: string[]
  rows: string[][]
}

export interface SettingEntry {
  key: string
  value: string
  description: string
}

export interface ProfileResponse {
  id: number
  fullName: string
  email: string
  mobile: string | null
  role: string
}

// ── API calls ────────────────────────────────────────────────────────────────

export function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/admin/stats')
}

export function getDelayTrend(days = 7): Promise<DelayTrendPoint[]> {
  return api.get<DelayTrendPoint[]>(`/admin/stats/delay-trend?days=${days}`)
}

export function getRecentActivity(limit = 20): Promise<AuditLogEntry[]> {
  return api.get<AuditLogEntry[]>(`/admin/stats/activity?limit=${limit}`)
}

export function getPassengers(q?: string, page = 0, size = 20): Promise<PageResponse<PassengerSummary>> {
  const params: Record<string, string | number> = { page, size }
  if (q) params.q = q
  return api.get<PageResponse<PassengerSummary>>('/admin/passengers', { params })
}

export function getPassenger(id: number): Promise<PassengerDetail> {
  return api.get<PassengerDetail>(`/admin/passengers/${id}`)
}

export function setPassengerEnabled(id: number, enabled: boolean): Promise<PassengerSummary> {
  return api.patch<PassengerSummary>(`/admin/passengers/${id}/enabled`, { enabled })
}

export function getAdminJourneys(
  params: { status?: string; train?: string; date?: string; passenger?: string; page?: number; size?: number }
): Promise<PageResponse<JourneyAdminSummary>> {
  return api.get<PageResponse<JourneyAdminSummary>>('/admin/journeys', { params })
}

export function cancelAdminJourney(id: number, reason: string): Promise<JourneyAdminSummary> {
  return api.post<JourneyAdminSummary>(`/admin/journeys/${id}/cancel`, { reason })
}

export function flagJourney(id: number, flagged: boolean): Promise<JourneyAdminSummary> {
  return api.patch<JourneyAdminSummary>(`/admin/journeys/${id}/flag`, { flagged })
}

export function getExtensionRequests(status?: string, page = 0, size = 20): Promise<PageResponse<ExtensionRequestAdminEntry>> {
  const params: Record<string, string | number> = { page, size }
  if (status) params.status = status
  return api.get<PageResponse<ExtensionRequestAdminEntry>>('/admin/extension-requests', { params })
}

export function resolveExtensionRequest(id: number, decision: string, note: string): Promise<ExtensionRequestAdminEntry> {
  return api.patch<ExtensionRequestAdminEntry>(`/admin/extension-requests/${id}`, { decision, note })
}

export function getAdminNotifications(channel?: string, status?: string, page = 0, size = 20): Promise<PageResponse<NotificationAdminEntry>> {
  const params: Record<string, string | number> = { page, size }
  if (channel) params.channel = channel
  if (status) params.status = status
  return api.get<PageResponse<NotificationAdminEntry>>('/admin/notifications', { params })
}

export function sendAnnouncement(target: string, title: string, body: string, trainNumber?: string, userId?: number): Promise<void> {
  return api.post<void>('/admin/notifications/announce', { target, title, body, trainNumber, userId: userId?.toString() })
}

export function retryNotification(id: number): Promise<void> {
  return api.post<void>(`/admin/notifications/${id}/retry`)
}

export function getAdminUsers(page = 0, size = 20): Promise<PageResponse<UserRoleEntry>> {
  return api.get<PageResponse<UserRoleEntry>>('/admin/users', { params: { page, size } })
}

export function changeUserRole(id: number, role: string): Promise<UserRoleEntry> {
  return api.patch<UserRoleEntry>(`/admin/users/${id}/role`, { role })
}

export function getReport(name: string, from?: string, to?: string): Promise<ReportData> {
  const params: Record<string, string> = {}
  if (from) params.from = from
  if (to) params.to = to
  return api.get<ReportData>(`/admin/reports/${name}`, { params })
}

export function exportReportCsv(name: string, from?: string, to?: string): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return `/api/admin/reports/${name}/export.csv?${params.toString()}`
}

export function getAdminSettings(): Promise<SettingEntry[]> {
  return api.get<SettingEntry[]>('/admin/settings')
}

export function updateSetting(key: string, value: string): Promise<SettingEntry> {
  return api.put<SettingEntry>(`/admin/settings/${key}`, { value })
}

export function getProfile(): Promise<ProfileResponse> {
  return api.get<ProfileResponse>('/profile')
}

export function updateProfile(fullName: string, mobile: string): Promise<ProfileResponse> {
  return api.put<ProfileResponse>('/profile', { fullName, mobile })
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.post<void>('/profile/password', { currentPassword, newPassword })
}
