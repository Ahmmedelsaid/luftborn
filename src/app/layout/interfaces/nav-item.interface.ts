/** One entry in the primary navigation rail. */
export interface NavItem {
  /** Translation key, so the rail carries no English. */
  readonly labelKey: string;
  readonly icon: string;
  readonly route: string;
}
