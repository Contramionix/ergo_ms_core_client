import { Type, Hash, Calendar, CheckCircle, MapPin, Globe } from 'lucide-vue-next'

export const typeIcon = {
  string: Type,
  integer: Hash,
  float: Hash,
  number: Hash,
  date: Calendar,
  'date&time': Calendar,
  bool: CheckCircle,
  boolean: CheckCircle,
  geopoint: MapPin,
  geopolygon: Globe,
}

export const typeColor = {
  string: '#0d6efd',
  integer: '#198754',
  float: '#198754',
  number: '#198754',
  date: '#fd7e14',
  'date&time': '#fd7e14',
  bool: '#20c997',
  boolean: '#20c997',
  geopoint: '#dc3545',
  geopolygon: '#6f42c1',
}

export function getTypeColor(type) {
  if (!type || typeof type !== 'string') return 'var(--color-accent)'
  return typeColor[type] ?? 'var(--color-accent)'
}
