# Mortal simulation rules

- A save begins at age zero. Its starting year, starting values, and generated family are stored alongside its seed. Given the same snapshot and sequence of typed actions, outcomes are reproducible.
- Age Up advances the year, ages living parents, resets energy and annual action usage, applies school and health progression, processes delayed effects, and checks contextual events. At most one new contextual event is triggered per year.
- A mandatory decision blocks other simulation actions until resolved. Each contextual event can trigger once per life. Some events have guaranteed age milestones, and optional events use seeded probability with contextual conditions and modifiers.
- Attributes and each relationship dimension stay between 0 and 100. The journal records the applied change after clamping. Balances use integer cents. Transactions account for every change to the bank balance.
- Study, personal activities, and family conversations have age and energy requirements. Each eligible action can be used once per year. Parents age independently of these interactions.
- Natural decline and seeded mortality can end a life in later years. The maximum age is 115. The final state retains its journal and can be opened from Saved Lives.

These parameters describe a fictional game world. The headless runner checks calendar consistency, attribute ranges, bank reconciliation, event repetition, and termination over a range of seeds.
