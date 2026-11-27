# Mortal simulation rules

- A save begins at age zero. Its starting year, starting values, and generated family are stored alongside its seed. Given the same snapshot and sequence of typed actions, outcomes are reproducible.
- Age Up advances the year, ages living parents, resets energy and annual action usage, applies school and health progression, processes delayed effects, and checks contextual events. At most one new contextual event is triggered per year.
- A mandatory decision blocks other simulation actions until resolved. Each contextual event can trigger once per life. Some events have guaranteed age milestones, and optional events use seeded probability with contextual conditions and modifiers.
- Attributes and each relationship dimension stay between 0 and 100. The journal records the applied change after clamping. Balances use integer cents. Transactions account for every change to the bank balance.
- Study, personal activities, and family conversations have age and energy requirements. Each eligible action can be used once per year. Parents age independently of these interactions.
- Natural decline and seeded mortality can end a life in later years. The maximum age is 115. The final state retains its journal and can be opened from Saved Lives.

## Education

- Primary starts at six, secondary at twelve, and high school at fifteen. High school requires performance of at least 35 and attendance of at least 45 to graduate. Postsecondary programs require 45 in both. Players who leave school early or fail high school can apply for one year of tuition-free high school equivalency as adults.
- Grades are independent of Smarts. The annual calculation blends prior performance, Smarts, Discipline, attendance, health, low academic stress, a matching aptitude bonus, and seeded variation. Activities are available once per year and affect grades, attendance, or stress as well as energy. A new school stage or program begins with its own performance and attendance.
- The first high school qualification triggers a mandatory decision through the journal. The gap year delays applications by one calendar year. The other choices set intent and leave the player free to change direction later.
- Admission checks qualifications and program prerequisites. The score weights the relevant previous grade at 56%, Smarts at 26%, and Discipline at 18%, plus seven points for a matching aptitude. A seeded roll from −7 to +5 determines offers around the program threshold. Offers expire after two years and can be accepted only while the player is unenrolled.
- Tuition for the first year is due at enrollment. Later terms are charged as they open if fully funded. If funding is insufficient, study and academic-year progression pause while the rest of the life continues. Eligible students can receive one merit or need-based scholarship per enrollment. Each funded year records its own scholarship credit and tuition debit. Money already paid stays in the ledger when the player withdraws.
- School peers age into Graduate at 18. Program students graduate after their cohort's expected duration. They spend the following year marked Job Seeker and then become Employed. These are occupation labels. Friendships survive stage changes, and only living contacts can interact.

These parameters describe a fictional game world. The headless runner varies graduation decisions, study effort, program applications, scholarships, funding holds, dropout, and adult reentry. It checks calendar consistency, bounded stats, bank and scholarship reconciliation, unique payments, eligibility and dates for earned qualifications, save round-trips, and termination.
