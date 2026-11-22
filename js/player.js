// The video player strip: play / pause, ±10 s, a seek bar, time played on the left and time left on the right.
// It drives one <video> element. The same element is the texture on the picture in AR (js/scan.js),
// so pause, skip and seek here act on what you see on the picture.

export const SKIP = 10; // seconds for the back / forward buttons

const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  s = Math.round(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const ICON_PLAY = 'M8 5.5v13l11-6.5z';
const ICON_PAUSE = 'M7 5h3.6v14H7zM13.4 5H17v14h-3.6z';
const ICON_AGAIN = 'M12 5a7 7 0 1 1-7 7h2.4A4.6 4.6 0 1 0 12 7.4V10L7.6 6.2 12 2.4z';

export function createPlayer(video, $, { stepAt } = {}){
  let dragging = false;
  const ui = $('player');
  const len = () => (isFinite(video.duration) ? video.duration : 0);

  function paint(){
    const d = len(), t = Math.min(video.currentTime || 0, d);
    const p = d > 0 ? t / d : 0;
    if (!dragging) $('seek').value = Math.round(p * 1000);
    const shown = dragging ? ($('seek').value / 1000) * d : t;
    $('seek').style.setProperty('--p', `${(dragging ? $('seek').value / 10 : p * 100).toFixed(2)}%`);
    $('tNow').textContent = fmt(shown);
    $('tLeft').textContent = '-' + fmt(d - shown);
    if (stepAt) $('stepName').textContent = stepAt(shown) || 'Step-by-step video';
  }
  function state(){
    const ended = video.ended;
    const playing = !video.paused && !ended;
    ui.classList.toggle('playing', playing);
    $('playIcon').setAttribute('d', playing ? ICON_PAUSE : ended ? ICON_AGAIN : ICON_PLAY);
    $('playBtn').setAttribute('aria-label', playing ? 'Pause' : ended ? 'Play again' : 'Play');
    $('trackState').textContent = playing ? 'Playing' : ended ? 'Finished' : 'Paused';
  }

  const play = () => {
    if (video.ended) video.currentTime = 0;
    return video.play().catch((e) => { console.warn(e); state(); });
  };
  const pause = () => video.pause();
  const toggle = () => { if (video.paused || video.ended) play(); else pause(); };
  const seekTo = (t) => {
    const d = len();
    video.currentTime = Math.min(Math.max(0, t), d || t);
    paint(); state();
  };
  const skip = (s) => seekTo((video.currentTime || 0) + s);

  $('playBtn').addEventListener('click', toggle);
  $('back10').addEventListener('click', () => skip(-SKIP));
  $('fwd10').addEventListener('click', () => skip(SKIP));
  $('seek').addEventListener('input', () => { dragging = true; paint(); });
  $('seek').addEventListener('change', () => { dragging = false; seekTo(($('seek').value / 1000) * len()); });
  ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach((e) => video.addEventListener(e, paint));
  ['play', 'pause', 'ended', 'playing'].forEach((e) => video.addEventListener(e, state));
  // keyboard on desktop: space = play / pause, arrows = ±10 s
  addEventListener('keydown', (e) => {
    if (!ui.offsetParent || e.target.tagName === 'INPUT') return;
    if (e.code === 'Space'){ e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowLeft') skip(-SKIP);
    else if (e.code === 'ArrowRight') skip(SKIP);
  });
  // smooth progress between timeupdate events
  (function tick(){ if (!video.paused && !dragging) paint(); requestAnimationFrame(tick); })();
  paint(); state();

  return { play, pause, toggle, skip, seekTo };
}
