# Mortal roadmap

## Phase 1 · Playable core

The application includes random and custom lives, a persistent journal, age progression, 50 contextual event templates, mandatory decisions and delayed consequences, and local save slots. Basic school, family, activities, bank, milestones, and the life summary connect to the same simulation state.

## Phase 2.1 · Advanced education

Implemented school performance and graduation, higher and vocational education, adult reentry, scholarships and tuition, academic records, and extended peer relationships. Browser and native clients share one simulation and migrate existing version 1 lives on load.

Validation covered 29 engine and SQLite tests, 2,000 seeded lives across all four graduation plans, and a browser scenario from an IndexedDB version 1 save through university graduation. The simulator checked ledger reconciliation, funding holds, and qualification dates for vocational, undergraduate, and postgraduate study.

## Phase 2.2 · Career and employment

Version 0.2.2 adds the job market, qualification-based hiring, part-time work during study, performance reviews, promotions, retirement, workplace relationships, and categorized finances with arrears. Schools and campus still run through the existing progression. Autonomous NPC careers, pensions, borrowing, and a broader labor market are later work.

Validation passed with 44 automated tests, 2,000 seeded lives, and both education and career browser scenarios. The simulation reconciled 92,540 salaried years and exercised promotions, dismissals, and retirement. Android and iOS production bundles exported successfully. Physical-device testing remains pending.

## Phase 3 · World simulation and assets

Add economic indicators and simulated news, property and vehicle transactions, employment and cost-of-living effects, and richer life summaries and achievements.

## Phase 4 · Specialized careers

Build specialized professions in increments, beginning with one complete career loop. Plan business and investments around the underlying economy.

## Phase 5 · Generational legacy

Expand family structure, inheritance, playable descendants, and generational history within the existing world.

## Phase 6 · Expansion

Explore additional fictional countries, scenarios, themes, localization, and release preparation.
