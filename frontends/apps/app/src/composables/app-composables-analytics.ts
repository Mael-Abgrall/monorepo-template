import type { CaptureResult } from 'posthog-js';
import posthog from 'posthog-js';
import { sanitizeUrl } from 'shared/url-sanitizer';

/**
 * Return an instance of the posthog client
 * @returns An object containing the posthog client
 */
export function usePostHog(): { posthog: typeof posthog } {
  /* eslint-disable camelcase -- not our code */
  posthog.init(
    import.meta.env.DEV
      ? 'phc_NZBDZa2Aji1Eeh7uJaxeqhNJWekEEfr2rDkBpGir1cf'
      : '', // todo changeme
    {
      api_host: 'https://eu.i.posthog.com',
      before_send: (event): CaptureResult | null => {
        if (event?.properties.$current_url) {
          event.properties.$current_url = sanitizeUrl({
            url: event.properties.$current_url as string,
          });
        }
        return event;
      },
      capture_pageleave: false,
      capture_pageview: false,
    },
  );
  /* eslint-enable camelcase -- not our code */

  return {
    posthog,
  };
}
