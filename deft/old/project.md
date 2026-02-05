# reminderbot.ai Project Guidelines

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

**⚠️ See also**: [main.md](../main.md) | [typescript.md](../languages/typescript.md) | [taskfile.md](../tools/taskfile.md) | [telemetry.md](../tools/telemetry.md)

## Project Configuration

**Tech Stack**: Static Web Site using TS + React + Next.js + Shadcn/UI + Tailwind CSS

**Specification**: [specification.md](../templates/specification.md)

## 📋 Workflow

```bash
task check         # Pre-commit (fmt, lint, test, test:coverage)
task test:coverage # Coverage (≥75%)
task build         # Build CLI
task clean         # Clean artifacts
```

## 🔐 Secrets

```bash
ls secrets/
cp secrets/oura.example secrets/oura  # Oura API token
```

## Standards

**Quality:**
- ! Run `task check` before every commit
- ! Achieve ≥85% coverage overall + per-module
- ! Store secrets in `secrets/` dir
- ~ Provide `.example` templates for secrets

**Telemetry:**
- ~ Structured logging (see [telemetry.md](../tools/telemetry.md))
- ~ Sentry.io for error tracking
- ? Distributed tracing for complex workflows
