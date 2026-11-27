import { create } from 'zustand';
import { summarize } from '../database/repository.ts';
import type { createRepository, SaveSummary, Slot } from '../database/repository.ts';
import { createLife } from '../engine/create.ts';
import { advance } from '../engine/simulation.ts';
import type { Action, ProfileInput } from '../engine/types.ts';

type Store = {
  slot: Slot | null;
  saves: SaveSummary[];
  ready: boolean;
  busy: boolean;
  problem: string | null;
  notice: string | null;
  haptics: boolean;
  initialize: () => Promise<boolean>;
  start: (profile?: ProfileInput) => Promise<boolean>;
  open: (id: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  dispatch: (action: Action) => Promise<boolean>;
  save: () => Promise<boolean>;
  toggleHaptics: () => Promise<boolean>;
  clearMessage: () => void;
};

export function createGameStore(openSaves: () => Promise<ReturnType<typeof createRepository>>, now = Date.now) {
  return create<Store>((set, get) => {
    let lastAgeCommit = -Infinity;
    function activate(slot: Slot | null) {
      lastAgeCommit = -Infinity;
      set({ slot });
    }
    function applySaved(slot: Slot, notice: string | null = null) {
      set((state) => ({ slot, notice, saves: [summarize(slot), ...state.saves.filter((item) => item.id !== slot.id)] }));
    }
    async function work(run: () => Promise<void>) {
      if (get().busy) return false;
      set({ busy: true, problem: null, notice: null });
      try {
        await run();
        return true;
      } catch (error) {
        set({ problem: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
        return false;
      } finally {
        set({ busy: false });
      }
    }
    return {
      slot: null,
      saves: [],
      ready: false,
      busy: false,
      problem: null,
      notice: null,
      haptics: true,
      clearMessage: () => set({ problem: null, notice: null }),
      initialize: () => work(async () => {
        const repository = await openSaves();
        const [saves, haptics] = await Promise.all([repository.list(), repository.haptics()]);
        set({ saves, haptics, ready: true });
      }),
      start: (profile) => work(async () => {
        const seed = Math.floor(Math.random() * 0x100000000);
        const life = createLife(seed, profile);
        const repository = await openSaves();
        const slot = await repository.insert(`${now().toString(36)}-${seed.toString(36)}`, life);
        lastAgeCommit = -Infinity;
        applySaved(slot);
      }),
      open: (id) => work(async () => {
        const repository = await openSaves();
        activate(await repository.load(id));
      }),
      remove: (id) => work(async () => {
        const repository = await openSaves();
        await repository.remove(id);
        if (get().slot?.id === id) activate(null);
        set({ saves: get().saves.filter((item) => item.id !== id), notice: 'Saved life deleted.' });
      }),
      dispatch: (action) => {
        const { slot } = get();
        if (!slot || (action.type === 'age' && now() - lastAgeCommit < 350)) return Promise.resolve(false);
        return work(async () => {
          const result = advance(slot.life, action);
          if (!result.life) throw new Error(result.error);
            if (result.life === slot.life) {
              set({ notice: 'No additional change this year.' });
              return;
            }
          const repository = await openSaves();
          const saved = await repository.save(slot, result.life);
          if (action.type === 'age') lastAgeCommit = now();
          applySaved(saved);
        });
      },
      save: () => work(async () => {
        const { slot } = get();
        if (!slot) throw new Error('Open a life before saving.');
        const repository = await openSaves();
        const saved = await repository.save(slot, slot.life);
        applySaved(saved, 'Life saved on this device.');
      }),
      toggleHaptics: () => work(async () => {
        const enabled = !get().haptics;
        const repository = await openSaves();
        await repository.setHaptics(enabled);
        set({ haptics: enabled });
      }),
    };
  });
}
