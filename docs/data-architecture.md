# Data Architecture Notes

## Scope

The first rollout is UK-based, but the schema is designed so countries, regions, authorities, roles, and routing data can expand without needing a destructive redesign.

## Core Principles

- Locale is attached to users and reports
- Country is first-class, not inferred from authority names
- Roles can be scoped globally, nationally, regionally, or per authority
- Routing and dispatch are separated from the report record
- Moderation actions are auditable

## Initial Role Model

- `resident`: creates reports and tracks own activity
- `warden`: triages local reports, merges duplicates, validates severity
- `moderator`: reviews visibility and operational quality across broader areas
- `admin`: manages routing, authorities, roles, and system configuration

## Expansion Strategy

- Add more locales by extending `src/i18n/` and the `locales` table
- Add more countries without changing the report schema
- Attach boundary datasets per country or per authority
- Support mixed dispatch modes by authority, such as email, webhook, or API
