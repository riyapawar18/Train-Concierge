import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError, triggerUnauthorized } from '@/lib/apiClient'
import { getProfile, updateProfile, changePassword } from '@/features/admin/api'

export function ProfilePage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: getProfile })

  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.fullName)
      setMobile(profile.data.mobile ?? '')
    }
  }, [profile.data])

  const saveProfile = useMutation({
    mutationFn: () => updateProfile(fullName, mobile),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-profile'] })
      toast({ title: 'Profile updated', tone: 'success' })
    },
    onError: (e) => toast({ title: normalizeApiError(e).message, tone: 'danger' }),
  })

  const savePw = useMutation({
    mutationFn: () => changePassword(currentPw, newPw),
    onSuccess: () => {
      toast({ title: 'Password changed. Please sign in again.', tone: 'success' })
      triggerUnauthorized()
    },
    onError: (e) => toast({ title: normalizeApiError(e).message, tone: 'danger' }),
  })

  const pwValid = currentPw && newPw && newPw === confirmPw

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" description="Update your name and contact details." eyebrow="Your account" />

      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Full name</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email <span className="text-muted">(read-only)</span></span>
            <input value={profile.data?.email ?? ''} readOnly
              className="h-10 rounded-lg border border-border bg-surface-muted px-3 text-sm text-muted cursor-not-allowed" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Mobile</span>
            <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile number"
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
          </label>
          <Button variant="cta" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
            {saveProfile.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[
            { label: 'Current password', value: currentPw, set: setCurrentPw },
            { label: 'New password', value: newPw, set: setNewPw },
            { label: 'Confirm new password', value: confirmPw, set: setConfirmPw },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{label}</span>
              <input type="password" value={value} onChange={e => set(e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            </label>
          ))}
          {newPw && confirmPw && newPw !== confirmPw && (
            <p className="text-sm text-danger">Passwords do not match.</p>
          )}
          <Button variant="cta" onClick={() => savePw.mutate()} disabled={!pwValid || savePw.isPending}>
            {savePw.isPending ? 'Changing…' : 'Change password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
