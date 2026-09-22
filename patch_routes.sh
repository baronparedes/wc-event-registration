#!/bin/bash
# Adding eventCountdownPattern
sed -i "s/eventPublicRegisterPattern: '\/events\/:slug\/register-public',/eventPublicRegisterPattern: '\/events\/:slug\/register-public',\n  eventCountdownPattern: '\/events\/:slug\/countdown',/g" src/config/constants/routes.ts

# Adding eventCountdown to AppRouteKey
sed -i "s/  | 'eventPublicRegister'/  | 'eventPublicRegister'\n  | 'eventCountdown'/g" src/config/constants/routes.ts

# Adding to APP_ROUTE_DEFINITIONS
sed -i "s/{ key: 'eventPublicRegister', path: ROUTE_PATHS.eventPublicRegisterPattern, layout: 'shell' },/{ key: 'eventPublicRegister', path: ROUTE_PATHS.eventPublicRegisterPattern, layout: 'shell' },\n  { key: 'eventCountdown', path: ROUTE_PATHS.eventCountdownPattern, layout: 'standalone' },/g" src/config/constants/routes.ts

# Adding to MINIMIZED_APP_SHELL_PATTERNS
sed -i "s/ROUTE_PATHS.eventPublicRegisterPattern,/ROUTE_PATHS.eventPublicRegisterPattern,\n  ROUTE_PATHS.eventCountdownPattern,/g" src/config/constants/routes.ts
