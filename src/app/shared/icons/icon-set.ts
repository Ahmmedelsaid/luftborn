/** Inline SVG icons, registered with `MatIconRegistry` so no icon font is loaded. */

function strokeIcon(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function filledIcon(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">${body}</svg>`;
}

export const APP_ICONS: Readonly<Record<string, string>> = {
  dashboard: strokeIcon(
    '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  ),
  tasks: strokeIcon(
    '<path d="m9 11 3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  ),
  calendar: strokeIcon(
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
  ),
  analytics: strokeIcon(
    '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
  ),
  team: strokeIcon(
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  ),
  settings: strokeIcon(
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  ),

  logo: strokeIcon('<path d="m5 12 4.5 4.5L19 7"/>'),
  search: strokeIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  bell: strokeIcon(
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  ),
  menu: strokeIcon('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'),
  close: strokeIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),

  plus: strokeIcon('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  edit: strokeIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  delete: strokeIcon(
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  ),
  refresh: strokeIcon(
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  ),
  filter: strokeIcon('<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>'),
  'chevron-down': strokeIcon('<path d="m6 9 6 6 6-6"/>'),
  'chevron-right': strokeIcon('<path d="m9 18 6-6-6-6"/>'),
  'more-vertical': filledIcon(
    '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  ),
  drag: filledIcon(
    '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
  ),

  'due-date': strokeIcon(
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M12 14v3l2 1"/>',
  ),
  overdue: strokeIcon(
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  ),
  completed: strokeIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>'),
  clock: strokeIcon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),

  'trend-up': strokeIcon('<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>'),
  'trend-down': strokeIcon('<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>'),
  'trend-flat': strokeIcon('<path d="M5 12h14"/>'),

  'stat-total': strokeIcon(
    '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/><path d="M19 8h-3"/>',
  ),
  'stat-progress': strokeIcon(
    '<path d="M3 12a9 9 0 0 1 15.5-6.2"/><path d="M21 4v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M3 20v-5h5"/>',
  ),

  inbox: strokeIcon(
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  ),
  'cloud-off': strokeIcon(
    '<path d="m2 2 20 20"/><path d="M5.8 5.8A7 7 0 0 0 8 19h9a4 4 0 0 0 1.5-7.7"/><path d="M10.3 4.3A7 7 0 0 1 18.6 10"/>',
  ),
  search_off: strokeIcon(
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="m8.5 8.5 5 5"/><path d="m13.5 8.5-5 5"/>',
  ),
};

/**
 * Maps the emoji the statistics API returns onto an icon name, since the design
 * renders glyphs. Unmapped emoji fall back to the character itself.
 */
export const STATISTIC_ICON_BY_EMOJI: Readonly<Record<string, string>> = {
  '📊': 'stat-total',
  '✅': 'completed',
  '🔄': 'stat-progress',
  '⚠️': 'overdue',
  '⚠': 'overdue',
};
