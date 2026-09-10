
import Lad from '@/app/lad/index';

/**
 * init viewer containing the elements that we can see in window,
 * @param _this
 * @returns
 */
export function calculateViewer(_this: Lad) {
  const centerView = document.getElementById('centerView');
  if (centerView === null) {
    return;
  }
  const animate = _this.ladData.animateDom;
  const viewer = _this.ladData.viewerDom;
  const animateDom = _this.ladData.animateOutDom;
  if (!animate || !viewer || !animateDom) {
    return;
  }

  // Coordinates relative to the top of the centerView child
  const animateDomY = animateDom.offsetTop;
  const windowX = centerView.scrollLeft;
  const windowY = centerView.scrollTop;
  const windowYE = windowY + centerView.offsetHeight;
  const windowXE = windowX + centerView.offsetWidth;

  const VDomY = animate.offsetTop + animateDomY;// Top of the virtual DOM
  const VDomX = 0;// Left of the virtual DOM
  const VDomYE = VDomY + _this.data.heightV;
  const VDomXE = VDomX + _this.data.widthV;

  // Viewer coordinates relative to the virtual DOM
  const viewerX = windowX;
  let viewerY = windowY - VDomY;
  let viewerXE = 0;
  let viewerYE = 0;
  if (viewerY < 0) {
    viewerY = 0;
  }
  if (VDomXE > windowXE) {
    viewerXE = windowXE;
  } else {
    viewerXE = VDomXE;
  }
  if (VDomYE > windowYE) {
    viewerYE = windowYE - VDomY;
  } else {
    viewerYE = VDomYE - VDomY;
  }

  _this.viewer = [[viewerX / _this.basicLength, viewerY / _this.basicLength], [viewerXE / _this.basicLength, viewerYE / _this.basicLength]];
  _this.width = viewerXE - viewerX;
  _this.height = viewerYE - viewerY;

  let marginTop = windowY - VDomY;
  if (marginTop < 0) {
    marginTop = 0;
  }

  if (viewer) {
    viewer.style.width = _this.width + 'px';
    viewer.style.height = _this.height + 'px';
    viewer.style.marginLeft = windowX + 'px';
    viewer.style.marginTop = marginTop + 'px';
  }
  if (_this.canvasView) {
    _this.canvasView.updateBackgroundAndWH({ width: _this.width, height: _this.height, background: false})
  }
  

  return null;
}