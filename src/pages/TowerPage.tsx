// TowerPage — wrapper that sets the BX background for the tower view.

import { TowerView } from '../components/tower/TowerView';

export function TowerPage() {
  return (
    <div className="bx min-h-screen w-full" style={{ background: 'var(--bx-ink)' }}>
      <TowerView />
    </div>
  );
}
