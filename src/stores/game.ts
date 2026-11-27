import { openSaves } from '../database/native';
import { createGameStore } from './gameState';

export const useGame = createGameStore(openSaves);
