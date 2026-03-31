import { SITE_CONFIGS, SUPPORTED_SOURCES } from '../config';
import type { SiteConfig, SupportedSource } from '../types';

/**
 * Type guard — returns true only for sources that have a registered SiteConfig.
 * Unsupported strings are caught here and treated as per-record failures.
 */
export function isSupportedSource(source: string): source is SupportedSource {
  return SUPPORTED_SOURCES.includes(source as SupportedSource);
}

/**
 * Returns the SiteConfig for a validated supported source.
 * Open/Closed: new sources are added by extending SITE_CONFIGS, not this function.
 */
export function getSiteConfig(source: SupportedSource): SiteConfig {
  return SITE_CONFIGS[source];
}
