import type { Family } from './types';

/* Playing-card shape, but not playing-card suits — hearts and diamonds
   meant nothing here. Each family gets a mark that says what it does:
   a die you swap in, a seal that stands for the whole game, a spark you
   spend once. */
export const FAMILY: Record<Family, string> = {
  dice:  '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="3.4"/>' +
         '<circle cx="9.5" cy="9.5" r="1.5" fill="currentColor" stroke="none"/>' +
         '<circle cx="14.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>',
  rule:  '<circle cx="12" cy="12" r="8.6"/><path d="M7.7 9.9h8.6"/><path d="M7.7 13.4h5.6"/>',
  charge:'<path d="M13.6 2.4 5.4 13.7h5.4l-1 7.9 8.2-11.5h-5.3z"/>'
};

/** Per-card glyphs. Bodies only — the <svg> wrapper is added by the Icon component. */
export const ICONS: Record<string, string> = {
  whet:'<rect x="3" y="8" width="12.6" height="12.6" rx="2.8"/>' +
       '<circle cx="6.8" cy="11.8" r="1.1" fill="currentColor" stroke="none"/>' +
       '<circle cx="11.8" cy="16.8" r="1.1" fill="currentColor" stroke="none"/>' +
       '<path d="M16.4 8.6 21.6 3.4"/><path d="M18.2 3 22 6.8"/>',
  crown:'<path d="M3.2 18.4h17.6"/><path d="M3.2 18.4 4.6 7l4.3 4.1L12 5l3.1 6.1L19.4 7l1.4 11.4z"/>',
  waxseal:'<circle cx="12" cy="13.6" r="6.4"/><path d="M9.4 13.6h5.2M12 11v5.2"/>' +
          '<path d="M8.2 8.2 6.4 3.2h11.2l-1.8 5"/>',
  quill:'<path d="M20.6 3.2c-8 1-12.6 5.4-14 9.8-.7 2.2-.3 4 .6 5.2"/>' +
        '<path d="M3.4 20.6 9 15"/><path d="M20.6 3.2c-1 6.4-4.6 9.6-9.4 10.4"/>',
  counting:'<path d="M4 20.6V9.4l8-5.6 8 5.6v11.2z"/><path d="M8.4 20.6v-5.4h7.2v5.4"/>' +
           '<path d="M9.6 11.4h4.8"/>',
  memory:'<path d="M4.2 12a7.8 7.8 0 1 0 2.4-5.6"/><path d="M3.4 3.6v4.6H8"/>' +
         '<path d="M12 8.2V12l2.8 2"/>',
  bellows:'<path d="M12 3.4 4.6 8.6v6.8L12 20.6l7.4-5.2V8.6z"/><path d="M12 3.4v17.2"/>' +
          '<path d="M8.3 6v12"/><path d="M15.7 6v12"/>',
  iron:'<rect x="3.6" y="7.4" width="16.8" height="13" rx="2.2"/>' +
       '<path d="M8 7.4V5.6a4 4 0 0 1 8 0v1.8"/><path d="M12 12v4"/>',
  windfall:'<path d="M12 3.2v11.6"/><path d="M8 10.8 12 14.8l4-4"/>' +
           '<path d="M3.8 15.4v3.4a2 2 0 0 0 2 2h12.4a2 2 0 0 0 2-2v-3.4"/>',
  tithe:'<circle cx="12" cy="7.4" r="4.3"/><path d="M12 5.4v4M10.7 6.4h2.4"/>' +
        '<path d="M12 13.6v6.8"/><path d="M8.8 17.6 12 20.8l3.2-3.2"/>',
  ivory:'<rect x="4" y="4" width="16" height="16" rx="3.2"/>' +
        '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" opacity=".4"/>' +
        '<line x1="6.4" y1="17.6" x2="17.6" y2="6.4"/>',
  brass:'<rect x="2.6" y="8" width="12.8" height="12.8" rx="2.8"/>' +
        '<circle cx="6.4" cy="11.8" r="1.15" fill="currentColor" stroke="none"/>' +
        '<circle cx="11.6" cy="11.8" r="1.15" fill="currentColor" stroke="none"/>' +
        '<circle cx="6.4" cy="17" r="1.15" fill="currentColor" stroke="none"/>' +
        '<circle cx="11.6" cy="17" r="1.15" fill="currentColor" stroke="none"/>' +
        '<path d="M19.4 10.6V3.4"/><path d="M16.7 6.1 19.4 3.4l2.7 2.7"/>',
  pauper:'<rect x="2.4" y="6.6" width="12.4" height="12.4" rx="2.8"/>' +
         '<circle cx="6" cy="10.2" r="1.05" fill="currentColor" stroke="none"/>' +
         '<circle cx="11.2" cy="15.4" r="1.05" fill="currentColor" stroke="none"/>' +
         '<circle cx="18.3" cy="16.4" r="4.1"/><path d="M18.3 14.1v4.6"/><path d="M16.9 15.3h2.1"/>',
  saint:'<rect x="5" y="7.8" width="14" height="13.2" rx="3"/>' +
        '<ellipse cx="12" cy="4.3" rx="5.6" ry="1.9"/>' +
        '<circle cx="9.2" cy="12" r="1.15" fill="currentColor" stroke="none"/>' +
        '<circle cx="14.8" cy="16.8" r="1.15" fill="currentColor" stroke="none"/>',
  devil:'<rect x="4.6" y="7.8" width="14.8" height="12.6" rx="3"/>' +
        '<path d="M6.6 7.8C5.4 5.8 5 4.1 5.4 2.6c1.3.8 2.4 2 3 3.4"/>' +
        '<path d="M17.4 7.8c1.2-2 1.6-3.7 1.2-5.2-1.3.8-2.4 2-3 3.4"/>' +
        '<circle cx="9.6" cy="12.2" r="1.15" fill="currentColor" stroke="none"/>' +
        '<circle cx="14.4" cy="16.4" r="1.15" fill="currentColor" stroke="none"/>',

  momentum:'<path d="M3.5 17.5 9 12l3.6 3.6L20.5 7.7"/><path d="M16.2 7.7h4.3V12"/>',
  insurance:'<path d="M2.8 12.4a9.2 9.2 0 0 1 18.4 0z"/>' +
            '<path d="M12 12.4v6.2a2.6 2.6 0 0 0 5.2 0"/><line x1="12" y1="2" x2="12" y2="3.2"/>',
  steady:'<rect x="2.2" y="8.8" width="19.6" height="6.4" rx="1.6"/>' +
         '<circle cx="12" cy="12" r="1.9"/>' +
         '<line x1="8.6" y1="8.8" x2="8.6" y2="15.2"/><line x1="15.4" y1="8.8" x2="15.4" y2="15.2"/>',
  warm:'<path d="M12 2.6s5.4 4.6 5.4 9.4a5.4 5.4 0 0 1-10.8 0c0-2.1 1-3.7 2.1-4.8 0 1.6 1 2.7 2.1 2.7 0-3.2-1-5.4 1.2-7.3z"/>',
  habit:'<line x1="2.4" y1="20.6" x2="21.6" y2="20.6"/>' +
        '<path d="M5 20.6v-4"/><path d="M10.3 20.6v-7.4"/><path d="M15.6 20.6V9.4"/><path d="M20.9 20.6V4.6"/>',
  third:'<rect x="1.4" y="8.4" width="6.6" height="6.6" rx="1.7"/>' +
        '<rect x="8.7" y="8.4" width="6.6" height="6.6" rx="1.7"/>' +
        '<rect x="16" y="8.4" width="6.6" height="6.6" rx="1.7"/>' +
        '<circle cx="19.3" cy="11.7" r="1.05" fill="currentColor" stroke="none"/>',

  shield:'<path d="M12 2.6 19.4 6v5.6c0 4.7-3.1 8-7.4 9.8-4.3-1.8-7.4-5.1-7.4-9.8V6z"/>' +
         '<path d="M8.9 12.1 11 14.2l4.1-4.1"/>',
  levy:'<ellipse cx="8" cy="7.4" rx="4.8" ry="2.3"/>' +
       '<path d="M3.2 7.4v3.4c0 1.27 2.15 2.3 4.8 2.3s4.8-1.03 4.8-2.3V7.4"/>' +
       '<path d="M21 18.2h-9.4"/><path d="M14.6 15.2l-3 3 3 3"/>',
  wind:'<path d="M20.4 12a8.4 8.4 0 1 1-2.75-6.2"/><path d="M20.4 3.9v4.6h-4.6"/>',
  warlord:'<path d="M6 21.4V2.6"/><path d="M4.2 21.4h3.6"/>' +
          '<path d="M6 4.2h11.6l-2.9 3.7 2.9 3.7H6z"/>',
  transmute:'<rect x="2.8" y="7.6" width="12.6" height="12.6" rx="2.9"/>' +
            '<circle cx="9.1" cy="13.9" r="1.25" fill="currentColor" stroke="none"/>' +
            '<path d="M18.6 2.4l1.2 2.9 2.9 1.2-2.9 1.2-1.2 2.9-1.2-2.9-2.9-1.2 2.9-1.2z"/>',
  ward:'<path d="M9.2 11.4V5.1a1.45 1.45 0 0 1 2.9 0v5.4"/>' +
       '<path d="M12.1 10.5V4.1a1.45 1.45 0 0 1 2.9 0v6.4"/>' +
       '<path d="M15 10.8V5.5a1.45 1.45 0 0 1 2.9 0v7.4"/>' +
       '<path d="M9.2 11.4V9.3a1.45 1.45 0 0 0-2.9 0v5.3c0 3.5 2.5 6.6 6.2 6.6h1.2c3.1 0 5.2-2.5 5.2-5.5v-2.8"/>'
};
