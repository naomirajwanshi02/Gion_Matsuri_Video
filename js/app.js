// Gion Matsuri Video: allow the camera → scan the Gion Matsuri float picture → a short note →
// OK plays the folding video right on the picture. Pause, ±10 s and a seek bar sit at the bottom.
// If the picture leaves the view, the video floats over the camera so you never lose your place.
//
// ?demo=1     skip the picture (camera still on, the video floats)
// ?preview=1  no camera at all (the video floats on a plain backdrop)

import { VIDEO_URL, VIDEO_FALLBACK } from './data.js';
import { scan, stopScan, scanning, plainCamera, showVideoOnPicture } from './scan.js';
import { createPlayer } from './player.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const S = { phase: 'perm', inView: false };

const overlay = (id, on) => $(id).classList.toggle('on', on);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch { /* no vibration */ } };
const pop = (el) => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };

// ------------------------------------------------------------ the video
// Played from the copy bundled in assets/.
const video = $('vid');
video.muted = true;               // the guide is silent; muted video may autoplay everywhere
video.loop = false;
let triedFallback = false;
video.addEventListener('error', () => {
  if (triedFallback) return;
  triedFallback = true;
  const t = video.currentTime;
  video.src = VIDEO_FALLBACK; video.load();
  video.addEventListener('loadedmetadata', () => { video.currentTime = t; }, { once: true });
});
video.src = q.get('video') || VIDEO_URL;
const player = createPlayer(video, $);

// While the picture is in view the video lives on it; otherwise it floats over the camera.
function placeVideo(){
  const f = $('float');
  const onPicture = scanning() && S.inView && S.phase === 'watch';
  showVideoOnPicture(S.phase === 'watch');
  f.hidden = S.phase !== 'watch';
  f.classList.toggle('ghost', onPicture);
  setHint();
}

// ------------------------------------------------------------ 0 · camera permission
async function cameraGranted(){
  try { return (await navigator.permissions?.query({ name: 'camera' }))?.state === 'granted'; } catch { return false; }
}
async function openPerm(){
  S.phase = 'perm';
  overlay('guide', false);
  if (await cameraGranted()) return openScan();
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){
    $('permStatus').textContent = 'This browser cannot use the camera here. Open the page over https in Safari or Chrome.';
    $('permBtn').disabled = true;
  }
  show('perm');
}
async function askCamera(){
  $('permBtn').disabled = true;
  $('permStatus').textContent = 'Waiting for you to tap “Allow”…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    $('permStatus').textContent = '';
    show(null);
    openScan();
  } catch (err) {
    console.error(err);
    $('permStatus').textContent = err?.name === 'NotAllowedError'
      ? 'The camera was blocked. Tap the “aA” or lock icon next to the address, allow the camera for this site, then tap Allow camera again.'
      : 'The camera did not start. Close other apps that use the camera and try again.';
  } finally { $('permBtn').disabled = false; }
}

// ------------------------------------------------------------ 1 · find the picture
async function openScan(){
  S.phase = 'scan';
  show(null); overlay('hud', false); overlay('guide', true); placeVideo();
  $('scanRetry').hidden = true;
  if (scanning()){ $('scanStatus').textContent = 'Looking for the picture…'; return; }
  $('scanStatus').textContent = 'Starting camera…';
  try {
    await scan($('ar'), { video, onStatus: (t) => { if (S.phase === 'scan') $('scanStatus').textContent = t; }, onFound, onLost });
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || err?.name || err || '');
    $('scanStatus').textContent = /mind|fetch|404/i.test(msg) ? `Could not load the picture data (${msg}).`
      : 'Camera not available. Allow camera access for this site in your browser settings, then tap Try again.';
    $('scanRetry').hidden = false;
  }
}
function onFound(){
  S.inView = true;
  if (S.phase === 'watch') placeVideo();
  if (S.phase !== 'scan') return;
  S.phase = 'found';
  overlay('guide', false);
  buzz(40);
  overlay('found', true);
  setTimeout(() => { overlay('found', false); openIntro(); }, 1300);
}
function onLost(){ S.inView = false; if (S.phase === 'watch') placeVideo(); }

// ------------------------------------------------------------ 2 · explanatory note
function openIntro(){
  S.phase = 'intro';
  overlay('guide', false);
  $('camStatus').textContent = '';
  show('intro');
}

// OK: the tap also unlocks video playback on phones.
async function begin(){
  $('goBtn').disabled = true;
  player.play();
  // if the camera is not running yet (skipped the picture), ask for it now
  if (!scanning() && !q.has('preview') && !$('ar').querySelector('video')){
    try { await plainCamera($('ar')); }
    catch (err) {
      console.error(err);
      $('camStatus').textContent = 'The camera did not start, so there is no AR view. You can still watch.';
      $('ar').classList.add('preview');
      await new Promise((r) => setTimeout(r, 1600));
    }
  }
  $('goBtn').disabled = false;
  S.phase = 'watch';
  show(null);
  overlay('hud', true);
  pop($('player'));
  placeVideo();
}

function setHint(){
  const h = $('hint');
  if (S.phase !== 'watch'){ h.textContent = ''; return; }
  if (q.has('preview') || $('ar').classList.contains('preview')){ h.textContent = 'Watching without the camera'; h.classList.remove('live'); return; }
  if (!scanning()){ h.textContent = 'Video floating over the camera'; h.classList.add('live'); return; }
  h.classList.toggle('live', S.inView);
  h.textContent = S.inView ? 'On the picture' : 'Picture out of view · video floating';
}

// ------------------------------------------------------------ wiring
$('permBtn').addEventListener('click', askCamera);
$('scanRetry').addEventListener('click', () => { stopScan(); openScan(); });
$('scanSkip').addEventListener('click', () => { stopScan(); overlay('guide', false); openIntro(); });
$('goBtn').addEventListener('click', begin);
$('closeBtn').addEventListener('click', () => { player.pause(); overlay('hud', false); openScan(); });
$('errBtn').addEventListener('click', () => { $('err').hidden = true; location.reload(); });

// MindAR's own listeners can throw after a failed camera start; the screen already says what to do.
const fromTracker = (s) => /mind-?ar/i.test(String(s));
addEventListener('error', (e) => { const s = e.error?.stack || e.message; if (fromTracker(s + e.filename)) return; $('errText').textContent = String(s); $('err').hidden = false; });
addEventListener('unhandledrejection', (e) => { const s = e.reason?.stack || e.reason; if (fromTracker(s)) return; $('errText').textContent = String(s); $('err').hidden = false; });

window.__gion = { S, begin, video, player };

if (q.has('preview')){ $('ar').classList.add('preview'); openIntro(); }
else if (q.has('demo')) openIntro();
else openPerm();
