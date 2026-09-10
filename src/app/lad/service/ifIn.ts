



export function ifIn(_this: {
    animateDom: HTMLElement;
    animateOutDom: HTMLElement;
    heightV: number;
    widthV: number;
}) {
    const centerView = (document.getElementById('centerView') as HTMLElement);
    const animate = _this.animateDom;
    const animateOutDom = _this.animateOutDom;
    // Coordinates relative to the top of the centerView child
    const animateOutDomY = animateOutDom.offsetTop;
    const windowX = centerView.scrollLeft;
    const windowY = centerView.scrollTop;
    const windowYE = windowY + centerView.offsetHeight;
    const VDomY = animate.offsetTop + animateOutDomY;// Top of the virtual DOM
    const VDomX = 0;// Left of the virtual DOM
    const VDomYE = VDomY + _this.heightV;
    const VDomXE = VDomX + _this.widthV;
    if (VDomXE <= windowX || VDomYE <= windowY || VDomY >= windowYE) {
        return false;// Virtual DOM is outside the window
    } else {
        return true;// Virtual DOM is inside the window
    }
}