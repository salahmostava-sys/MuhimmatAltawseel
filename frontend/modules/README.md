# Modules Structure

This folder follows a domain-first structure for easier onboarding and ownership:

- `hr/` → employees, attendance, alerts, apps
- `finance/` → salaries, advances
- `operations/` → orders, vehicles, fuel, platform accounts, violation resolver
- `settings/` → system settings and profile

Implementation note:

- Legacy route wrappers still live under `modules/pages/*` during migration.
- Prefer importing concrete feature files from domain folders instead of keeping unused barrel layers.
