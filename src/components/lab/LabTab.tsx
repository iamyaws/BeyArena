// LabTab — Battle Lab home. Resting state shows two pickers + KAMPF STARTEN
// button. Will be fleshed out in Tasks 13-14. This placeholder lets us wire
// routing + nav without breaking other work.

export function LabTab() {
  return (
    <div className="bx" style={{ padding: '12px 18px 110px' }}>
      <div className="bx-eyebrow">BEYBLADE LAB</div>
      <div className="bx-display" style={{ fontSize: 26, marginTop: 8 }}>
        Teste deine Beys
      </div>
      <div style={{ marginTop: 24, color: 'var(--bx-mute)' }}>
        (placeholder — picker UI lands in Task 14)
      </div>
    </div>
  );
}
