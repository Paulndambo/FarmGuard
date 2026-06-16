import type { FarmForm, LoginForm, RegisterForm } from './types'

export const cropOptions = [
  'maize',
  'tea',
  'coffee',
  'avocado',
  'rice',
  'vegetables',
  'mixed',
  'other',
]

export const emptyRegisterForm: RegisterForm = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  password_confirm: '',
}

export const emptyLoginForm: LoginForm = {
  username: '',
  password: '',
}

export const emptyFarmForm: FarmForm = {
  name: '',
  county: '',
  latitude: '',
  longitude: '',
  crop_type: 'maize',
  land_acres: '1.00',
  notes: '',
}
