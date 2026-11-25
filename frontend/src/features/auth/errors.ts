import { isNormalizedApiError } from '@/lib/apiClient'

export interface ServerFieldError {
  field: string
  message: string
}

export function serverFieldErrors(
  error: unknown,
  fields: readonly string[],
): ServerFieldError[] {
  if (!isNormalizedApiError(error)) {
    return []
  }

  return error.fieldErrors.filter((entry) => fields.includes(entry.field))
}

export function isEmailTakenError(error: unknown): boolean {
  return isNormalizedApiError(error) && (error.status === 409 || error.code === 'EMAIL_TAKEN')
}

export function authErrorMessage(error: unknown): string {
  if (!isNormalizedApiError(error)) {
    return 'Something went wrong. Please try again.'
  }

  switch (error.status) {
    case 0:
      return 'We could not reach the server. Check your connection and try again.'
    case 400:
      return 'Please check the highlighted fields.'
    case 401:
      return 'Incorrect email or password.'
    case 403:
      return 'You do not have permission to do that.'
    case 409:
      return 'An account with this email already exists.'
    case 429:
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 502:
      return 'We could not send the email just now. Please try again in a moment.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
