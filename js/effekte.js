/*
 * Kleine Optik-Effekte für die Knöpfe. Nur Aussehen, keine Spiel-Logik.
 * Beim Tippen auf einen Knopf läuft ein Lichtkreis von der Tippstelle aus.
 */
(() => {
  const KNOEPFE = '.btn, .btn-haupt';

  document.addEventListener('pointerdown', (e) => {
    const knopf = e.target.closest(KNOEPFE);
    if (!knopf || knopf.disabled) return;
    const r = knopf.getBoundingClientRect();
    knopf.style.setProperty('--rx', `${e.clientX - r.left}px`);
    knopf.style.setProperty('--ry', `${e.clientY - r.top}px`);
    knopf.classList.remove('welle');
    void knopf.offsetWidth; // Animation neu starten
    knopf.classList.add('welle');
  });

  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'knopf-welle') e.target.classList.remove('welle');
  });

  // Fokus-Rahmen nur für Tastatur-Bedienung. Das Spiel setzt den Fokus oft selbst (Pack, Karte,
  // Fenster-Knöpfe); manche Handys zeigten dann einen roten oder weissen Rahmen. Regel: css/schaltflaechen.css
  const wurzel = document.documentElement;
  document.addEventListener('keydown', (e) => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) wurzel.classList.add('tastatur');
  });
  document.addEventListener('pointerdown', () => wurzel.classList.remove('tastatur'));
})();
