import {
  Activity,
  Bell,
  CalendarRange,
  ChartColumn,
  Hotel,
  LayoutDashboard,
  LogOut,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  TrainFront,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavRole = 'passenger' | 'admin'

export interface NavItem {
  label: string
  icon: LucideIcon
  to?: string
  action?: 'sign-out'
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface NavConfig {
  role: NavRole
  label: string
  navLabel: string
  home: string
  groups: NavGroup[]
}

export const passengerNav: NavConfig = {
  role: 'passenger',
  label: 'Passenger',
  navLabel: 'Passenger navigation',
  home: '/app/dashboard',
  groups: [
    {
      label: 'TRAVEL',
      items: [
        { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
        { label: 'My Journeys', to: '/app/journeys', icon: Ticket },
        { label: 'Train Search', to: '/app/search', icon: Search },
        { label: 'Train Status', to: '/app/status', icon: Activity },
      ],
    },
    {
      label: 'ASSISTANCE',
      items: [
        { label: 'Disruptions', to: '/app/disruptions', icon: TriangleAlert },
        { label: 'Recovery Recommendations', to: '/app/recovery', icon: Route },
        { label: 'Hotels & Stay Recovery', to: '/app/hotels', icon: Hotel },
        { label: 'Notifications', to: '/app/notifications', icon: Bell },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { label: 'My Profile', to: '/app/profile', icon: User },
        { label: 'Settings', to: '/app/settings', icon: Settings },
        { label: 'Sign Out', action: 'sign-out', icon: LogOut },
      ],
    },
  ],
}

export const adminNav: NavConfig = {
  role: 'admin',
  label: 'Admin',
  navLabel: 'Admin navigation',
  home: '/admin/dashboard',
  groups: [
    {
      label: 'OPERATIONS',
      items: [
        { label: 'Admin Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Passenger Management', to: '/admin/passengers', icon: Users },
        { label: 'Journey Management', to: '/admin/journeys', icon: CalendarRange },
        { label: 'Train Management', to: '/admin/trains', icon: TrainFront },
        { label: 'Disruption Management', to: '/admin/disruptions', icon: TriangleAlert },
      ],
    },
    {
      label: 'ASSISTANCE',
      items: [
        { label: 'Recovery Recommendations', to: '/admin/recommendations', icon: Route },
        { label: 'Hotel Management', to: '/admin/hotels', icon: Hotel },
        { label: 'Notification Management', to: '/admin/notifications', icon: Bell },
      ],
    },
    {
      label: 'ADMINISTRATION',
      items: [
        { label: 'User Roles & Access', to: '/admin/roles', icon: ShieldCheck },
        { label: 'Reports & Analytics', to: '/admin/reports', icon: ChartColumn },
        { label: 'System Settings', to: '/admin/settings', icon: Settings },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { label: 'My Profile', to: '/admin/profile', icon: User },
        { label: 'Sign Out', action: 'sign-out', icon: LogOut },
      ],
    },
  ],
}

export function getNavConfig(role: NavRole): NavConfig {
  return role === 'admin' ? adminNav : passengerNav
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (!item.to) {
    return false
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function findActiveNav(nav: NavConfig, pathname: string) {
  for (const group of nav.groups) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item)) {
        return { group, item }
      }
    }
  }
  return null
}
