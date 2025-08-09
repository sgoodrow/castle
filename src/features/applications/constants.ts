/**
 * Volunteer Application Constants
 * Shared between production code and tests for consistency
 */

export const VOLUNTEER_APPLICATION = {
  CUSTOM_ID: "volunteer-application",
  LABEL: "Volunteer Application",
  FORM_URL:
    "https://docs.google.com/forms/d/e/1FAIpQLSelYSgoouJCOIV9qoOQ1FdOXj8oGC2pfv7P47iUUd1hjOic-g/viewform",
} as const;

export const APPLICATION_CONTENT = {
  WARNING: "DO NOT REPLY TO THIS MESSAGE.",
  APPLY_QUESTION: "How do I apply?",
  PROCESS_QUESTION: "What happens to an application?",
  REVIEW_TIMELINE: "less than a week",
  NO_PRIVILEGES_MESSAGE: "leadership and volunteering are duties with no special privileges",
} as const;

/**
 * Complete application content template
 * Used by RequestApplication.content getter
 */
export const APPLICATION_MESSAGE_TEMPLATE = `**${APPLICATION_CONTENT.WARNING}**

In Castle, ${APPLICATION_CONTENT.NO_PRIVILEGES_MESSAGE}. Volunteers may step down at any time.

**${APPLICATION_CONTENT.APPLY_QUESTION}**
Fill out the following Google form: ${VOLUNTEER_APPLICATION.FORM_URL}.

**${APPLICATION_CONTENT.PROCESS_QUESTION}**
Applications are reviewed by current officers. This process typically takes ${APPLICATION_CONTENT.REVIEW_TIMELINE}.` as const;
