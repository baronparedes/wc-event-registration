#!/bin/bash
# Adding EventCountdownPage import
sed -i "s/const PublicEventRegistrationPage = lazy(() =>/const EventCountdownPage = lazy(() =>\n  import('..\/pages\/events\/[slug]\/countdown').then((module) => ({\n    default: module.EventCountdownPage,\n  })),\n);\nconst PublicEventRegistrationPage = lazy(() =>/g" src/app/router.tsx

# Adding to routeComponents
sed -i "s/  eventPublicRegister: PublicEventRegistrationPage,/  eventPublicRegister: PublicEventRegistrationPage,\n  eventCountdown: EventCountdownPage,/g" src/app/router.tsx
