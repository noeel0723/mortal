# Mortal simulation rules

- A save begins at age zero. Its starting year, starting values, and generated family are stored alongside its seed. Given the same snapshot and sequence of typed actions, outcomes are reproducible.
- Age Up advances the year, ages living parents, resets energy and annual action usage, applies school and health progression, processes delayed effects, and checks contextual events. At most one new contextual event is triggered per year.
- A mandatory decision blocks other simulation actions until resolved. Each contextual event can trigger once per life. Some events have guaranteed age milestones, and optional events use seeded probability with contextual conditions and modifiers.
- Attributes and each relationship dimension stay between 0 and 100. The journal records the applied change after clamping. Balances use integer cents. Transactions account for every change to the bank balance.
- School, career, and relationship actions retain their own requirements and annual limits. Personal activities can be repeated without spending energy. Parents age independently of these interactions.
- Natural decline and seeded mortality can end a life in later years. The maximum age is 115. The final state retains its journal and can be opened from Saved Lives.

## Education

- Primary starts at six, secondary at twelve, and high school at fifteen. High school requires performance of at least 35 and attendance of at least 45 to graduate. Postsecondary programs require 45 in both. Players who leave school early or fail high school can apply for one year of tuition-free high school equivalency as adults.
- Grades are independent of Smarts. The annual calculation blends prior performance, Smarts, Discipline, attendance, health, low academic stress, a matching aptitude bonus, and seeded variation. Activities are available once per year and affect grades, attendance, or stress as well as energy. A new school stage or program begins with its own performance and attendance.
- The first high school qualification triggers a mandatory decision pop-up. The gap year delays applications by one calendar year. The other choices set intent and leave the player free to change direction later.
- Admission checks qualifications and program prerequisites. The score weights the relevant previous grade at 56%, Smarts at 26%, and Discipline at 18%, plus seven points for a matching aptitude. A seeded roll from −7 to +5 determines offers around the program threshold. Offers expire after two years and can be accepted only while the player is unenrolled.
- Tuition for the first year is due at enrollment. Later terms are charged as they open if fully funded. If funding is insufficient, study and academic-year progression pause while the rest of the life continues. Eligible students can receive one merit or need-based scholarship per enrollment. Each funded year records its own scholarship credit and tuition debit. Money already paid stays in the ledger when the player withdraws.
- School peers age into Graduate at 18. Program students graduate after their cohort's expected duration. They spend the following year marked Job Seeker and then become Employed. These are occupation labels. Friendships survive stage changes, and only living contacts can interact.

## Work and finance

- Employment opens at 18, with one active contract. A vacancy stays stable for the current calendar year and each application can be attempted once. Offers expire at Age Up. Specialized jobs check both the required level and relevant tags on a matching credential, plus industry experience. Hiring depends on grades where available, relevant attributes, experience, reputation, competition, and a seeded roll.
- A player can work part-time while studying. Working more than 16 hours a week reduces attendance and raises academic stress. Full-time work and enrollment are mutually exclusive. Adjusting hours changes workload while the contracted salary stays fixed until a raise, promotion, or new job.
- Annual review depends on performance and security. Two consecutive warnings can end employment. Promotions also require a listed path, fit for the new role, reputation, and a seeded opportunity. Salaries stay within the role's band. One raise request is allowed per year.
- Actions between birthdays take effect at the start of the current simulation year. The contract active at the next Age Up earns the previous year's pay, so quitting, replacing the job, or retiring before the boundary removes that contract from the next payroll. Settlement records the earned salary and bills in the new calendar year, including the final elapsed adult year at death.
- Age Up advances the calendar, resets annual limits, applies natural health changes, and ages living NPCs. It then settles prior-year payroll, income tax, older arrears, and new living bills, records elapsed experience, and expires offers. Illness progression runs after settlement. Death closes a job. If the player survives, academic workload, grades and tuition are processed before reviews, promotions or dismissal, delayed outcomes, and the contextual event. The repository saves the resulting turn atomically.
- All amounts use integer cents in the existing currency. Salary above $240 is taxed at 8%, with an additional 8% above $700 and 5% above $1,300. Housing varies by city. Food, utilities, transportation, and personal costs are recorded separately. Unpaid essential costs carry forward by category, and wages can clear those bills on a later turn.
- The workplace roster keeps the same contact IDs across saves and job changes. Former co-worker friends remain available as friends. Current work discussions can improve performance. Insulting or pranking a current colleague hurts job security or reputation in addition to the relationship.

## Health and events

- Age and health influence the seeded chance of new illness. One active case per patient can improve, persist, or worsen over later years. Untreated illness can lower health and the player's energy.
- Each city has three doctors. Higher reputation carries a higher fee and a higher probability of successful treatment. Severity lowers that probability. Successful treatment clears a mild or moderate case and stabilizes a severe case to moderate. The selected fee is charged for the visit even if the case persists.
- Health visits can repeat if the patient and balance still qualify. Emergency care guarantees stabilization for a severe illness, and the optometrist treats eye strain. For players under 18, the community doctor, emergency care, and the optometrist are free. To accompany a living family member or friend, the player must have received salary and have enough cash. Visits that NPCs arrange independently do not charge the player.
- Psychiatry reduces stress and improves happiness. Eligible players can repeat blood and plasma donations without spending energy. The first plasma donation each year adds compensation to other income in the ledger.
- Decisions block gameplay until answered. Informational pop-ups wait behind any decision and are acknowledged in journal order. Their journal entries remain available afterward.

The headless runner varies education, employment, and doctor visits across seeded lives. It checks salary bounds, contract eligibility, ledger and tax reconciliation, unique payments, graduation dates, save round-trips, and termination.

## Library and property

- The first three library visits in a year can roll for an encounter, with at most one encounter that year. Shared-hobby encounters can add a friend and can happen again in a later year.
- Renting, asking a parent for a home, and buying assets become available at 18. A housing request checks the parent's available funds and uses the relationship and seeded roll to determine consent. A gifted starter home becomes the player's residence automatically.
- Each purchase debits the full in-game price and creates one owned item. Players can move into any house they own. The annual housing bill uses the current residence, from a family contribution or rent to maintenance for an owned home.
