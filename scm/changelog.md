# Changelog Standards

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

**⚠️ See also**: [git.md](./git.md) | [github.md](./github.md) | [versioning.md](../core/versioning.md)

**Specification**: [Keep a Changelog 1.0.0](https://keepachangelog.com/en/1.0.0/)

## Scope

! CHANGELOG.md applies **only to releases** (tagged versions), not individual commits or pushes.

## Purpose

The changelog documents notable changes for **users and consumers** of the software between releases. Individual commits are tracked in git history for developers.

## Format

! Use Keep a Changelog format in `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features in development

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes

## [1.0.0] - 2024-01-18

### Added
- Initial release

[Unreleased]: https://github.com/user/repo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/user/repo/releases/tag/v1.0.0
```

## Sections

! Use exactly these section headings:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes

~ Include only sections with changes for each release.

## When to Update

! Update CHANGELOG.md **as part of the release process**, not on every commit:

1. Develop features with Conventional Commits
2. Before release, update CHANGELOG.md with notable changes since last release
3. Move items from `[Unreleased]` to new version section
4. Commit changelog update
5. Tag release
6. Push code + tags

## What to Include

! Include changes that affect **users or integrations**:

**Include:**
- New features users can access
- Breaking changes requiring user action
- Deprecated features users should stop using
- Bug fixes users will notice
- Security fixes
- Important performance improvements

**Exclude:**
- Internal refactoring invisible to users
- Documentation typos
- Build system changes
- Development tool updates
- Test changes

## Version Format

! Each release section takes the form:

```markdown
## [MAJOR.MINOR.PATCH] - YYYY-MM-DD
```

! Versions listed in reverse chronological order (newest first).

! Use semantic versioning for version numbers (see [versioning.md](../core/versioning.md)).

## Entry Format

~ Each change is a concise bullet point:

```markdown
### Added
- Dark mode support for web UI
- Export to CSV functionality in reports
```

~ Start each entry with a verb (Added, Fixed, Changed, etc. implied by section).

! Keep entries user-focused, not implementation-focused.

**Good examples:**
- "Added dark mode toggle in settings"
- "Fixed crash when opening large files"
- "Removed deprecated `--legacy` flag"

**Bad examples:**
- "Refactored authentication module" (internal, not user-visible)
- "Updated ESLint to v8" (dev dependency, not user-facing)
- "Fixed typo in README" (documentation, minor)

## Unreleased Section

! Maintain an `[Unreleased]` section at the top.

~ Add notable changes to `[Unreleased]` as they're developed.

! Move items from `[Unreleased]` to versioned section during release.

## Breaking Changes

! Clearly mark breaking changes:

```markdown
## [2.0.0] - 2024-02-15

### Changed
- **BREAKING**: Renamed `--output` flag to `--file`
- **BREAKING**: Removed support for Python 3.8
```

~ Provide migration guidance for breaking changes:

```markdown
### Changed
- **BREAKING**: API endpoint `/api/v1/users` moved to `/api/v2/users`
  - Migration: Update all API calls to use `/api/v2/users`
  - Old endpoint will be removed in v3.0.0
```

## Links

~ Include comparison links at bottom:

```markdown
[Unreleased]: https://github.com/user/repo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/user/repo/releases/tag/v1.0.0
```

! Update links when adding new versions.

## Examples

### Minimal Release

```markdown
## [1.0.1] - 2024-01-20

### Fixed
- Crash when opening files larger than 10MB
- Incorrect timezone display in logs
```

### Feature Release

```markdown
## [1.1.0] - 2024-02-01

### Added
- Dark mode support
- Export data to CSV format
- Keyboard shortcuts for common actions

### Fixed
- Memory leak in background sync
- Incorrect sorting in dashboard
```

### Breaking Changes Release

```markdown
## [2.0.0] - 2024-03-01

### Changed
- **BREAKING**: Removed `--legacy` flag (use `--format=legacy` instead)
- **BREAKING**: Minimum Node.js version now 18.x
  - Migration: Upgrade Node.js to 18.x or later

### Added
- New plugin system for extensibility
- Built-in support for PostgreSQL 15

### Removed
- Support for deprecated config file format (`.oldrc`)
```

## Integration with Release Process

### Using git/GitHub

```bash
# 1. Update CHANGELOG.md
# Move [Unreleased] items to [X.Y.Z] section

# 2. Commit changelog
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v1.2.0"

# 3. Tag release
git tag -a v1.2.0 -m "Release v1.2.0"

# 4. Push
git push origin master v1.2.0

# 5. Create GitHub release
gh release create v1.2.0 --title "v1.2.0" --notes-file CHANGELOG.md
```

### Automated Generation

? Use tools to help generate changelog from Conventional Commits:

- `conventional-changelog`
- `git-cliff`
- `release-please`

≉ Rely solely on automated generation; always review and edit for user clarity.

## Compliance

- ! Maintain `CHANGELOG.md` in project root
- ! Update only during release process, not on every commit
- ! Use Keep a Changelog format with exact section names
- ! Include only user-facing changes
- ! Use semantic versioning for release numbers
- ! Mark breaking changes clearly
- ! Write entries from user perspective, not developer perspective
- ~ Provide migration guidance for breaking changes
- ~ Keep entries concise (1-2 lines per change)

---

**See also**:
- [Keep a Changelog 1.0.0](https://keepachangelog.com/en/1.0.0/) - Full specification
- [versioning.md](../core/versioning.md) - Semantic versioning standards
- [git.md](./git.md) - Git workflow and tagging
- [github.md](./github.md) - GitHub releases
