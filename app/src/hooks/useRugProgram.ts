import { useContext } from 'react';
import { ProgramContext } from './useProgram';

export function useRugProgram() {
  return useContext(ProgramContext);
}
