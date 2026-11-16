# AI Coding & Architecture Instructions

## 1. Ground Truth & Specifications

Before generating, planning, or modifying code, reference:

- `openspec/specs/` (`member-directory`, `event-attendance-tracking`) for living specifications, user flows, and functional requirements.
- `openspec/config.yaml` for high-level project vision, UX constraints, and cross-cutting rules.
- `docs/Tech-spec.md` for baseline technical architecture, database schema, and folder conventions.

## 2. Specification Management (OpenSpec)

- All requirement updates, functional changes, and scope additions must follow the OpenSpec workflow (`openspec proposal` -> `specs delta` -> `design` -> `tasks` -> `archive`).
- Do not maintain detached PRD documents. Living specifications under `openspec/specs/` remain the single source of truth.
