// Hero glue: loads the avatar component and mirrors its mood into the meter.
// Pronunciation stays in assets/js/scripts.js.
import './avatar.js';

const hero = document.querySelector('.hero');
if (hero) {
  const mood = hero.querySelector('.hero-mood');
  const num = hero.querySelector('.hero-num');
  const fill = hero.querySelector('.hero-fill');
  hero.addEventListener('moodchange', ({detail: {mood: m, patience}}) => {
    mood.textContent = m;
    num.textContent = `${patience}%`;
    fill.style.width = `${patience}%`;
    // Drains from ink to red as patience runs out.
    fill.style.background = `color-mix(in oklab, var(--primary-accent) ${patience}%, #e8412c)`;
  });
}
