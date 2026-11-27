# Mortal roadmap

## Phase 1 · Playable core

The application includes random and custom lives, a persistent journal, age progression, 50 contextual event templates, mandatory decisions and delayed consequences, and local save slots. Basic school, family, activities, bank, milestones, and the life summary connect to the same simulation state.

## Phase 2.1 · Advanced education

Implemented school performance and graduation, higher and vocational education, adult reentry, scholarships and tuition, academic records, and extended peer relationships. Browser and native clients share one simulation and migrate existing version 1 lives on load.

Validation covered 29 engine and SQLite tests, 2,000 seeded lives across all four graduation plans, and a browser scenario from an IndexedDB version 1 save through university graduation. The simulator checked ledger reconciliation, funding holds, and qualification dates for vocational, undergraduate, and postgraduate study.

## Phase 2.2 · Career and employment

Version 0.2.2 adds the job market, qualification-based hiring, part-time work during study, performance reviews, promotions, retirement, workplace relationships, and categorized finances with arrears. Schools and campus still run through the existing progression.

Validation passed with 44 automated tests, 2,000 seeded lives, and both education and career browser scenarios. The simulation reconciled 92,540 salaried years and exercised promotions, dismissals, and retirement. Android and iOS production bundles exported successfully. Physical-device testing remains pending.

## Phase 2.3 · Love, family, and independent NPC life

Version 0.2.3 adds adult dating, friendship tiers, engagement, marriage, divorce, adoption, child development, expanded family records, and NPC-led decisions. Save format 7 preserves existing lives. NPC careers and finances use a limited annual model. The family currently generates up to one sibling and one grandparent, and family planning resolves in one turn. Detailed legal settlements, wider economic simulation, and playable descendants belong to later phases.

Validation passed with 68 automated tests and five browser scenarios, including the social flow from a V6 save at 320 and 390 pixels. The 2,000-life simulation exercised 973 weddings, 1,853 children including 1,031 adoptions, and 47 divorces. Web, Android, and iOS production bundles built successfully. Expo dependency checking ran in offline mode.

## Phase 2.4 · Personal growth, skills, and lifestyle

Version 0.2.4 adds individual skill progression, talent discovery, amateur competitions, creative showcases, hobbies, and lifestyle choices. School, employment, relationships, and parenting can develop or use those skills. Save format 8 migrates older lives with an empty skill history. Professional leagues and entertainment industries remain part of future phases.

The 2,000-life simulation reached 91,503 salaried years and 1,402 promotions. The table reports each life’s highest proficiency, age at first Elite skill among those who reached it, and lifetime skill expenses in integer cents. Expenses include competition fees and children’s lessons. Employment and promotion columns count lives, so they can be compared with each strategy’s sample size.

| Strategy | Lives | Peak proficiency (P10 / P50 / P90) | Elite reached | Median age at Elite | Expenses (P10 / P50 / P90, cents) | Employed | Promoted |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: |
| Incidental development | 333 | 65 / 65 / 65 | 0 | — | 0 / 0 / 9,000 | 313 | 227 |
| Recreational | 334 | 80 / 87 / 93 | 89 | 69 | 0 / 8,100 / 9,000 | 293 | 211 |
| Sports | 334 | 100 / 100 / 100 | 334 | 16 | 450 / 4,500 / 13,200 | 307 | 198 |
| Paid learning | 333 | 100 / 100 / 100 | 333 | 20 | 100,300 / 116,450 / 136,850 | 317 | 203 |
| Career-focused | 333 | 100 / 100 / 100 | 333 | 27 | 0 / 0 / 9,000 | 304 | 207 |
| Creative | 333 | 100 / 100 / 100 | 333 | 19 | 15,600 / 20,725 / 30,650 | 300 | 211 |

## Phase 3 · World simulation and assets

Add economic indicators and simulated news, property and vehicle transactions, employment and cost-of-living effects, and richer life summaries and achievements.

## Phase 4 · Specialized careers

Build specialized professions in increments, beginning with one complete career loop. Plan business and investments around the underlying economy.

## Phase 5 · Generational legacy

Expand family structure, inheritance, playable descendants, and generational history within the existing world.

## Phase 6 · Expansion

Explore additional fictional countries, scenarios, themes, localization, and release preparation.
