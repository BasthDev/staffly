import { useState, useEffect } from 'react';
import { updateService, UpdateState } from '../lib/updateService';

export function useAppUpdates() {
  const [state, setState] = useState<UpdateState>(updateService.getState());

  useEffect(() => {
    const unsubscribe = updateService.subscribe(setState);
    // Initial check on hook mount
    updateService.checkForUpdates();
    return unsubscribe;
  }, []);

  return {
    ...state,
    checkForUpdates: () => updateService.checkForUpdates(),
    applyUpdate: () => updateService.applyUpdate(),
    dismissPopup: (snoozeDuration?: number) => updateService.dismissPopup(snoozeDuration),
    simulateUpdate: (isImmediate?: boolean) => updateService.simulateUpdate(isImmediate),
  };
}
