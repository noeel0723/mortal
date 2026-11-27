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

## Phase 3.0 · The Living World

Version 0.3.0 adds deterministic economic cycles, markets for ten industries and three cities, employer conditions, and fictional news. Save version 9 adds annual national history and keeps legacy offers, contracts, wealth, assets, and skill records. Company accounting, mortgages, and investments remain future work.

### Skill balancing

Both runs used the same 2,000 seeds and existing training strategies. The second applies a steeper curve above 55 with benefits for varied methods and recent public events. Practice remains free. Course, coaching, and activity fees kept their nominal prices. The isolated balancing runs had identical employment and promotion counts for each strategy.

| Strategy | Elite before → after | Peak P10/P50/P90 before → after | First Elite age P10/P50/P90 before → after | Training expense P10/P50/P90, cents | Employed / promoted |
| --- | --- | --- | --- | --- | --- |
| Incidental | 0 → 0 of 333 | 65/65/65 → 65/65/65 | — | 0/0/9,000 | 313/227 |
| Recreational | 89 → 0 of 334 | 80/87/93 → 72/76/79 | 60/69/74 → — | 0/8,100/9,000 | 293/211 |
| Sports | 334 → 288 of 334 | 100/100/100 → 89/92/94 | 15/16/18 → 29/34/41 | 450/4,500/13,200 | 307/198 |
| Paid learning | 333 → 312 of 333 | 100/100/100 → 90/92/93 | 18/20/23 → 35/41/48 | 100,300/116,450/136,850 | 317/203 |
| Career-focused | 333 → 174 of 333 | 100/100/100 → 86/90/93 | 20/27/37 → 44/54/64 | 0/0/9,000 | 304/207 |
| Creative | 333 → 333 of 333 | 100/100/100 → 93/94/96 | 17/19/22 → 33/40/49 | 15,600/20,725/30,650 | 300/211 |

Aptitude groups use each life’s highest-performing skill, so group membership can change when another skill becomes their best. Higher aptitude is associated with earlier Elite attainment, while lower aptitude still reaches it with sustained effort. Peak medians moved from 100 to 89 in the low group, 91 in the middle group, and 92 in the high group.

| Peak skill aptitude | Elite before → after | Median first Elite age before → after | Median training expense, cents, before → after | Employed / promoted before → after |
| --- | --- | --- | --- | --- |
| Under 45 | 374/547 → 257/544 | 22 → 45 | 7,200 → 7,200 | 511/359 → 508/356 |
| 45–72 | 667/977 → 544/978 | 20 → 40 | 5,425 → 5,425 | 889/603 → 890/604 |
| 73 and above | 381/476 → 306/478 | 18 → 35 | 6,000 → 5,425 | 434/295 → 436/297 |

### Economy validation

A separate 2,000-life run with the world system enabled recorded 91,684 salaried years, 34 relocations, 1,508 promotions, and 443 economic redundancies. The table compares median world indicators and individual outcomes. Working-age observations include people intentionally out of work or studying. Salaries and arrears are grouped with the conditions when they accrued. Reviews and layoffs use the following year’s conditions.

| Regime | Years observed | Growth | Inflation | Unemployment | Adult years without work | Annual salary median, cents | Review median | Promotions | Redundancies |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Expansion | 52,743 | 1.46% | 1.76% | 5.93% | 2,635/30,601 | 122,624 | 97 | 511 | 0 |
| Boom | 19,181 | 3.53% | 2.69% | 4.17% | 985/11,045 | 124,959 | 97 | 205 | 0 |
| Stagnation | 30,366 | 0.41% | 1.64% | 7.07% | 1,523/17,764 | 121,027 | 98 | 287 | 0 |
| Recession | 29,944 | −1.89% | 1.14% | 9.17% | 1,512/17,735 | 119,305 | 97 | 249 | 301 |
| Crisis | 7,860 | −3.92% | 2.07% | 12.75% | 417/4,720 | 116,649 | 97 | 57 | 142 |
| Recovery | 18,939 | 1.25% | 1.30% | 7.79% | 960/11,469 | 120,092 | 97 | 199 | 0 |

| Lifetime or world metric | P10 | P50 | P90 |
| --- | ---: | ---: | ---: |
| Annual inflation | 0.62% | 1.67% | 3.08% |
| National unemployment | 4.60% | 6.82% | 10.03% |
| Consumer price index | 115.16 | 199.14 | 250.00 |
| Annual growth | −2.37% | 0.93% | 2.91% |
| Consecutive years without work | 1 | 1 | 47 |
| Lifetime gross salary, cents | 2,815,468 | 5,393,271 | 11,110,214 |
| Final savings, cents | 0 | 1,582,524 | 6,017,669 |
| Final arrears, cents | 0 | 0 | 1,087,825 |
| Direct job changes | 0 | 1 | 1 |

The price index reached its 250 ceiling in the upper part of the distribution. The longest periods without work include a strategy that abstains from employment for the full working-age span. A total of 377 lives ended with arrears.

## Phase 4 · Specialized careers

Build specialized professions in increments, beginning with one complete career loop. Plan business and investments around the underlying economy.

## Phase 5 · Generational legacy

Expand family structure, inheritance, playable descendants, and generational history within the existing world.

## Phase 6 · Expansion

Explore additional fictional countries, scenarios, themes, localization, and release preparation.
