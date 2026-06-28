import { env } from '@/config/env'
import { ClassicEventRegistrationFlow } from './ClassicEventRegistrationFlow'
import { WizardEventRegistrationFlow } from './WizardEventRegistrationFlow'

export function EventRegistrationPage() {
  return env.registrationWizardEnabled ? (
    <WizardEventRegistrationFlow />
  ) : (
    <ClassicEventRegistrationFlow />
  )
}
