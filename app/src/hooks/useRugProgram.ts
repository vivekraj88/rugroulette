import { useContext } from 'react';
import { ProgramContext } from './RugProgramContext';

export function useRugProgram() {
  return useContext(ProgramContext);
}
