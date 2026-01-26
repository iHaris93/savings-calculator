# Changelog

All notable changes to this project are documented in this file.

This project uses date-based entries rather than semantic version numbers. Dates are in UTC.

## 2026-01-26

### Changed
- Removed the branded header bar (logo + "Hardware savings calculator" label) from both Guided and Live so the calculator feels like a single continuous page when embedded.
- Moved the Guided/Live mode switch into a compact pill in the main content area; it now simply flips views while preserving shared URL-backed state.
- Simplified Guided mode intro copy and removed explicit "Inside this estimate" / "stays in sync with Live" messaging to avoid over-explaining internals.
- Updated Guided behavior so the estimate card fully replaces the wizard once the user clicks **Show estimate**, and **Edit answers** / **Start over** reliably bring the wizard back and hide results.

### Live mode logic & UX
- Kept the standard IP camera cost input fully editable in all scenarios, including reuse (Scenario B), while still modeling reused cameras as zero new camera hardware cost.
- Replaced the existing camera and smart-camera checkboxes with explicit Yes/No radio groups, and added guard logic so a camera cannot simultaneously be treated as both standard and smart.
- Aligned scenario detection with these Yes/No answers so Scenario A/B/C remain derived from `hasSmartCameras` / `hasExistingCameras` in the shared calc core.
- Switched the Sighthound software analytics selector from radios to two independent checkboxes (LPR, MMCG), mapping to `software = none | lpr | mmcg | both`; leaving both unchecked now cleanly represents a hardware-only estimate.
- Tightened top-of-page copy in Live mode to emphasize "Adjust the assumptions below…" and removed redundant secondary headings above the results column.

### Docs
- Updated `SPECIFICATION.md` to reflect the dual-mode layout, inline mode switch, Yes/No camera questions, and checkbox-based software selection, and to deprecate references to the older single software cost field.
- Updated `README.md` to document the new Guided flow (wizard vs results swap), the Yes/No camera questions that drive scenarios, and the new software selection UX.

## 2026-01-22

### Added
- Visual emphasis styling for the Scenario A savings card, with green/red states that track savings vs extra cost while preserving existing math.
- Smooth fade transitions for scenario-specific sections (smart cameras, reuse cameras, new deployments) to avoid jarring content snaps.
- Value-change highlighting on key result cards so users can immediately see which parts of the output respond to each input.
- Always-visible standard IP camera cost input so hardware assumptions remain explicit even when existing cameras are reused.
- Improved print/PDF layout that stacks results above inputs and adds a page break before the **Your setup** section.
- Sighthound black logo in the print/export header for branded estimates.

### Changed
- Tightened spacing between the primary cost and deployment detail cards to keep the desktop view compact and aligned.
- Standardized breakdown math copy to use `x` between quantity and unit price (for example, `Compute Nodes: 3 x $3,500.00 = $10,500.00`).
- Updated software labels and copy to "Your software costs (recurring)" and ensured monthly vs annual wording is consistent across summary and breakdown.

### Infrastructure
- GitHub Actions workflow to run the calculator tests on pushes and pull requests.

## 2026-01-16

### Added
- Animated state changes for results, making savings and deployment details feel more responsive during live demos.
- PDF export of the current calculator scenario so results can be shared or attached to follow-up emails.

### Changed
- Updated GitHub Pages configuration and links so the public URL points to the canonical hosted calculator.

## 2026-01-14

### Added
- Optional monthly software comparison that lets users enter a per-camera software cost and compare it with Sighthound software pricing.
- Centralized core calculator math into shared functions to keep calculations and unit tests aligned.
- Support documentation for embedding the calculator via GitHub Pages and Squarespace `<iframe>` embeds.

### Changed
- Clarified calculator input labels and helper copy, especially around the optional software comparison.
- Removed a duplicate estimator heading that appeared in the Squarespace embed layout.

## 2026-01-09

### Added
- Dark mode theme toggle and supporting visual assets.
- "Reset calculations" control that returns inputs and URL parameters to their defaults.

### Changed
- Reordered result cards so absolute costs appear before the savings callout, making the story easier to follow in demos.
- Expanded README documentation for the hardware savings calculator behavior and assumptions.

## 2026-01-08

### Added
- Initial savings calculator scaffold as a static single-page app with baseline inputs and results.

### Changed
- Frozen baseline calculator math and UI as a reference point before broader layout and UX iterations.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


### Added
- **`wrun reset` command**: Reset configuration files to default/empty state
  - Interactive mode: prompts for each file individually
  - Batch mode (`--all`): resets all files without prompting
  - Resets user.md to default template, deletes project.md/PRD.md/SPECIFICATION.md
- **Guided workflow prompts**: Commands now chain together interactively
  - `wrun install` asks to run `wrun project` after completion
  - `wrun bootstrap` asks to run `wrun project` after completion (if in warping directory)
  - `wrun project` asks to run `wrun spec` after completion
  - Creates smooth guided flow: install → bootstrap → project → spec
- **Enhanced command descriptions**: Each command now shows detailed explanation at startup
  - `wrun install`: Shows what will be created (warping/, secrets/, docs/, Taskfile.yml, .gitignore)
  - `wrun project`: Explains project.md purpose (tech stack, quality standards, workflow)
  - `wrun spec`: Explains PRD.md creation and AI interview process
- **Smart project name detection**: `wrun spec` reads project name from project.md
  - Auto-suggests project name if project.md exists
  - Falls back to manual input if not found
- **Improved prompt_toolkit installation**: Better detection and instructions
  - Shows exact Python interpreter path being used
  - Detects externally-managed Python (PEP 668)
  - Automatically includes `--break-system-packages` flag when needed
  - Provides clear explanation and alternatives (venv, pipx)
  - Links to PEP 668 documentation

### Changed
- **Renamed `wrun.py` → `wrun`**: Removed .py extension for cleaner command
  - Follows Unix convention for executables
  - More professional appearance
  - All documentation updated
- **Renamed `wrun init` → `wrun install`**: Better matches common tooling patterns
  - Aligns with Makefile/Taskfile conventions (make install, task install)
  - Clearer intent: "install warping framework"
  - Less confusion with bootstrap command
  - Updated all references: "initialized" → "installed", "Reinitialize" → "Reinstall"
- **Updated README.md**: Added Quick Start section with wrun commands
  - Shows complete workflow: install → bootstrap → project → spec
  - Lists all available commands with descriptions

### Fixed
- **prompt_toolkit installation issues**: Python version mismatch detection
  - Now uses `python -m pip` instead of bare `pip` command
  - Ensures package installs for correct Python interpreter
  - Prevents "module not found" errors when Python 3.x versions differ


### Added
- **AgentSkills Integration**: Added `SKILL.md` for Claude Code and clawd.bot compatibility
  - Follows AgentSkills specification for universal AI assistant compatibility
  - Auto-invokes when working in warping projects or mentioning warping standards
  - Teaches AI assistants about rule precedence, lazy loading, TDD, SDD, and quality standards
  - Includes comprehensive "New Project Workflow" section with step-by-step guidance
  - Documents complete SDD process: PRD → AI Interview → Specification → Implementation
  - Compatible with both Claude Code (IDE) and clawd.bot (messaging platforms)
- **clawd.bot Support**: Added clawd.bot-specific metadata to SKILL.md
  - Requires `task` binary (specified in metadata)
  - Supports macOS and Linux platforms
  - Homepage reference to GitHub repository
  - Installation paths for shared and per-agent skills
- **Integration Documentation**: Created `docs/claude-code-integration.md` (renamed to include clawd.bot)
  - Installation instructions for both Claude Code and clawd.bot
  - Usage examples across IDE and messaging platforms
  - Publishing guidance for Skills Marketplace and ClawdHub
  - Multi-agent setup documentation
  - Cross-platform benefits and compatibility notes

### Changed
- **SKILL.md Structure**: Enhanced with detailed workflow sections
  - Step-by-step initialization workflow (init → bootstrap → project → spec)
  - Conditional logic for first-time user setup
  - Complete SDD workflow documentation with user review gates
  - Context-aware workflows for new projects vs existing projects vs new features
  - Integration notes expanded to cover multiple AI platforms


### Added
- **Project Type Selection**: Added "Other" option (option 6) to project type selection in `warping.sh project`
  - Prompts for custom project type when selected
  - Allows flexibility for project types beyond CLI, TUI, REST API, Web App, and Library

### Changed
- **Spec Command Output**: Improved next steps messaging in `warping.sh spec`
  - Now displays full absolute paths to PRD.md and SPECIFICATION.md
  - Updated AI assistant references to "Claude, Warp.dev, etc."
  - Added steps 5-7 with guidance on reviewing, implementing, and continuing with AI
  - Clearer instructions: "Ask your AI to read and run {full_path}"


### Added
- **LICENSE.md**: Added license file with temporary usage terms through 2026
  - Permission to use (but not distribute) for repository collaborators
  - Future plans for permissive license preventing resale
- **Copyright Notice**: Added copyright to README.md with contact email


### Added
- **SCM Directory**: Created `scm/` directory for source control management standards
  - `scm/git.md` - Git workflow and conventions
  - `scm/github.md` - GitHub workflows and releases
  - `scm/changelog.md` - Changelog maintenance standards (releases only)
- **Versioning Standards**: Added `core/versioning.md` with RFC2119-style Semantic Versioning guide
  - Applies to all software types (APIs, UIs, CLIs, libraries)
  - Decision trees, examples, and FAQ
  - Integration with git tags and GitHub releases

### Changed
- **SCM Reorganization**: Moved `tools/git.md` and `tools/github.md` to `scm/` directory
- **Documentation Standards**: All technical docs now use strict RFC2119 notation
  - Use symbols (!, ~, ?, ⊗, ≉) only, no redundant MUST/SHOULD keywords
  - Minimizes token usage while maintaining clarity
- **Internal References**: All docs reference internal files instead of external websites
  - semver.org → `core/versioning.md`
  - keepachangelog.com → `scm/changelog.md`

### Fixed
- Removed all redundant MUST/SHOULD/MAY keywords from technical documentation
- Corrected RFC2119 syntax throughout framework (swarm.md, git.md, github.md)
- Fixed grammar issues in changelog.md

### Added

#### Core Features
- **CLI Tool**: New `warping.sh` script for bootstrapping and project setup
  - `warping.sh bootstrap` - Set up user preferences
  - `warping.sh project` - Configure project settings
  - `warping.sh init` - Initialize warping in a new project
  - `warping.sh validate` - Validate configuration files
- **Task Automation**: Added `Taskfile.yml` with framework management tasks
  - `task validate` - Validate all markdown files
  - `task build` - Package framework for distribution
  - `task install` - Install CLI to /usr/local/bin
  - `task stats` - Show framework statistics
- **Template System**: User and project configuration templates
  - `templates/user.md.template` - Template for new users
  - Generic templates in `core/user.md` and `core/project.md`

#### Documentation
- **REFERENCES.md**: Comprehensive lazy-loading guide for when to read which files
- **Expanded Language Support**: Added detailed standards for:
  - C++ (cpp.md) - C++20/23, Catch2/GoogleTest, GSL
  - TypeScript (typescript.md) - Vitest/Jest, strict mode
- **Interface Guidelines**: New interface-specific documentation
  - `interfaces/cli.md` - Command-line interface patterns
  - `interfaces/rest.md` - REST API design
  - `interfaces/tui.md` - Terminal UI (Textual, ink)
  - `interfaces/web.md` - Web UI (React, Tailwind)

#### Organization
- **New `coding/` directory**: Reorganized coding-specific standards
  - `coding/coding.md` - General coding guidelines
  - `coding/testing.md` - Universal testing standards
- **Meta files**: Added self-improvement documentation
  - `meta/code-field.md` - Coding mindset and philosophy
  - `meta/lessons.md` - Codified learnings (AI-updatable)
  - `meta/ideas.md` - Future directions
  - `meta/suggestions.md` - Improvement suggestions

### Changed

#### Breaking Changes
- **Directory Restructure**: Moved files to new locations
  - `core/coding.md` → `coding/coding.md`
  - `tools/testing.md` → `coding/testing.md`
  - All cross-references updated throughout framework
- **User Configuration**: `core/user.md` now in `.gitignore`
  - Users should copy from `templates/user.md.template`
  - Prevents accidental commits of personal preferences

#### Improvements
- **Enhanced README.md**: Comprehensive overview with examples
- **Better Documentation**: Clearer hierarchy and precedence rules
- **Framework Philosophy**: Documented key principles (TDD, SDD, Task-centric workflows)
- **Coverage Requirements**: Standardized at ≥85% across all languages
- **Fuzzing Standards**: Added ≥50 fuzzing tests per input point requirement

### Removed
- **Pronouns Field**: Removed from user bootstrap process in `warping.sh`

### Fixed
- All internal references updated to reflect new directory structure
- Consistent path references across all markdown files
- Cross-reference links in language and interface files


Initial release of the Warping framework with:
- Core AI guidelines (main.md)
- Python and Go language standards
- Basic project structure
- Taskfile integration guidelines
- Git and GitHub workflows

---

## Migration Guide: 0.1.0 → 0.2.0

### File Paths
If you have custom scripts or references to warping files, update these paths:
- `core/coding.md` → `coding/coding.md`
- `tools/testing.md` → `coding/testing.md`

### User Configuration
1. Copy `templates/user.md.template` to `core/user.md`
2. Customize with your preferences
3. Your `core/user.md` will be ignored by git

### New Features to Explore
- Run `warping.sh bootstrap` to set up user preferences interactively
- Check out `REFERENCES.md` for lazy-loading guidance
- Explore new interface guidelines if building CLIs, APIs, or UIs
- Review enhanced language standards for Python, Go, TypeScript, and C++

<<<<<<< HEAD
=======
[0.2.5]: https://github.com/visionik/warping/releases/tag/v0.2.5
[0.2.4]: https://github.com/visionik/warping/releases/tag/v0.2.4
[0.2.3]: https://github.com/visionik/warping/releases/tag/v0.2.3
[0.2.2]: https://github.com/visionik/warping/releases/tag/v0.2.2
[0.2.1]: https://github.com/visionik/warping/releases/tag/v0.2.1
[0.2.0]: https://github.com/visionik/warping/releases/tag/v0.2.0
[0.1.0]: https://github.com/visionik/warping/releases/tag/v0.1.0
>>>>>>> 3bc586e (docs: update CHANGELOG.md and README.md for v0.2.5)
