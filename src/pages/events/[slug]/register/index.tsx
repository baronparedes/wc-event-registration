import { env } from '@/config/env'
import { ClassicEventRegistrationFlow } from './components/ClassicEventRegistrationFlow'
import { WizardEventRegistrationFlow } from './components/WizardEventRegistrationFlow'

export function EventRegistrationPage() {
  return env.registrationWizardEnabled ? (
    <WizardEventRegistrationFlow />
  ) : (
    <ClassicEventRegistrationFlow />
  )
}
