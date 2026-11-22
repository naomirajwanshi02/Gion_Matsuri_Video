// Image recognition: MindAR image tracking (mind-ar 1.2.5 + three 0.160.0, the same pins as the other
// scan-to-X repos) watches the back camera for the Gion Matsuri float picture. When it is found, the video
// video is drawn on the picture as a three.js plane (a VideoTexture on the <video> element), so it
// stays glued to the card as you move. Pause / skip act on the same <video>, see js/player.js.

const params = new URLSearchParams(location.search);
export const TARGET_SRC = params.get('target') || './targets.mind';

let current = null;
let THREE_ = null;

// A plane exactly the size of the target, textured with the video. The picture is 9:16, like the video.
async function addVideoPlane(mindar, anchor, video){
  THREE_ = THREE_ || await import('three');
  const T = THREE_;
  const tex = new T.VideoTexture(video);
  tex.colorSpace = T.SRGBColorSpace;
  tex.minFilter = T.LinearFilter; tex.magFilter = T.LinearFilter; tex.generateMipmaps = false;
  const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, toneMapped: false });
  // MindAR anchors are 1 unit wide and (target height / width) tall, centred on the picture.
  // The picture is tall (690 x 1600) and the video is 9:16: the video spans the picture's full width and sits in the middle.
  const aspect = (video.videoWidth || 9) / (video.videoHeight || 16);
  const w = 1, h = w / aspect;
  const plane = new T.Mesh(new T.PlaneGeometry(w, h), mat);
  plane.position.set(0, 0, 0.002);
  plane.userData.fade = 0;
  anchor.group.add(plane);
  return plane;
}

export async function scan(container, { onStatus, onFound, onLost, video }){
  stopScan();
  onStatus('Loading the scanner…');
  const { MindARThree } = await import('mindar-image-three');
  const mindar = new MindARThree({
    container, imageTargetSrc: TARGET_SRC, uiScanning: 'no', uiLoading: 'no', uiError: 'no',
    filterMinCF: 0.001, filterBeta: 1000, warmupTolerance: 3, missTolerance: 10,
  });
  current = mindar;
  const anchor = mindar.addAnchor(0);
  let plane = null, shown = false, wasFound = false;
  anchor.onTargetFound = () => { wasFound = true; onFound(); };
  anchor.onTargetLost = () => { wasFound = false; onLost?.(); };
  mindar.videoPlane = () => plane;
  mindar.showVideo = (on) => { shown = on; };
  onStatus('Starting camera…');
  try { await mindar.start(); }
  catch (e){ stopScan(); throw e || new Error('camera unavailable'); }
  if (video) plane = await addVideoPlane(mindar, anchor, video);
  mindar.renderer.setAnimationLoop(() => {
    if (plane){
      // fade the video in once it is switched on, and out when it is not
      const target = shown && wasFound ? 1 : 0;
      plane.userData.fade += (target - plane.userData.fade) * 0.18;
      plane.material.opacity = plane.userData.fade;
      plane.visible = plane.userData.fade > 0.01;
    }
    mindar.renderer.render(mindar.scene, mindar.camera);
  });
  onStatus('Looking for the picture…');
}

export const scanning = () => !!current;
export const showVideoOnPicture = (on) => current?.showVideo?.(on);

export function stopScan(){
  if (!current) return;
  const m = current;
  current = null;
  try { m.renderer.setAnimationLoop(null); } catch { /* fine */ }
  try { m.controller.stopProcessVideo(); } catch { /* fine */ }
  try { m.stop(); } catch { /* never started */ }
  try { m.renderer.dispose(); } catch { /* fine */ }
  const c = m.container;
  if (c){ c.querySelectorAll('video').forEach((v) => v.srcObject?.getTracks?.().forEach((t) => t.stop())); c.innerHTML = ''; }
}

// ?demo=1 skips the picture but keeps the camera as the background.
export async function plainCamera(container){
  stopScan();
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  const v = document.createElement('video');
  Object.assign(v, { srcObject: stream, muted: true, playsInline: true, autoplay: true });
  v.setAttribute('playsinline', '');
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
  container.innerHTML = ''; container.appendChild(v);
  await v.play().catch(() => {});
}
