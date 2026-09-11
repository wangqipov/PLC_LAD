/**
 * TIA Portal-style LAD canvas colors.
 * Grid step and symbol sizes come from host.basicLength; this file is color and stroke only.
 */
export const TiaTheme = {
    /** Network background */
    paper: '#ffffff',
    /** Grid (TIA editor light gray) */
    grid: '#e6e6e6',
    /** Symbols, wires, power rail */
    ink: '#1a1a1a',
    /** Variable names and notes */
    label: '#1a1a1a',
    /** Selection frame (TIA cyan) */
    selectStroke: '#00a2e8',
    selectFill: 'rgba(0, 162, 232, 0.22)',
    /** Hover frame */
    hoverStroke: '#7fc9e8',
    /** Translucent drag preview */
    previewFill: 'rgba(0, 90, 160, 0.12)',
    previewStroke: 'rgba(0, 70, 140, 0.55)',
    /** Marquee rectangle */
    marqueeStroke: '#00a2e8',
    marqueeFill: 'rgba(0, 162, 232, 0.08)',
    /** Drop-slot assist box */
    assistFill: '#fff4b0',
    assistStroke: '#c9a000',
    /** Magnet-hot connection slot */
    assistHotFill: '#8ee0b0',
    assistHotStroke: '#1a8a4a',
    /** Pin hit target */
    pinFill: '#ffffff',
    pinStroke: '#00a2e8',
    /** Monitor blue wire */
    monitor: '#1e6cff',
    /** Power rail */
    powerRail: '#1a1a1a',
} as const;

/** Max characters per FB pin name line (matches original blockTextNum) */
export const blockTextNum = 12;

/** Zoom range for basicLength (px) */
export const ZoomLimit = {
    min: 12,
    max: 72,
    step: 1.1,
} as const;

/** Pin hit radius (CSS px) */
export const PIN_HIT_RADIUS = 7;

/** Wire hit half-width (CSS px) */
export const WIRE_HIT_HALF = 4;

/** Assist box size in grid units (pixels = size * basicLength) */
export const ASSIST_SIZE = 0.2;

/** Assist boxes sit on pin/wire ends with no extra gap */
export const ASSIST_OUTSET = 0;

/** Extra hit pad (grid units) so the 0.2-grid yellow square can start a wire */
export const ASSIST_WIRE_HIT = 0.35;

/** Magnet radius as a multiple of the grid (covers margin_horizontal) */
export const ASSIST_MAGNET = 1.05;
