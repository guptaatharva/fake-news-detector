import { describe, it, expect } from 'vitest';
import { recordSubmissionAndCheckAbuse } from './abuseMonitor';

describe('recordSubmissionAndCheckAbuse', () => {
  it('does not flag the first submission of some content', () => {
    const result = recordSubmissionAndCheckAbuse('user-1', 'The bridge reopened today.');
    expect(result.isAbusive).toBe(false);
    expect(result.occurrences).toBe(1);
  });

  it('flags the same identity resubmitting identical content 3+ times', () => {
    const identity = `user-repeat-${Math.random()}`;
    recordSubmissionAndCheckAbuse(identity, 'Identical content.');
    recordSubmissionAndCheckAbuse(identity, 'Identical content.');
    const third = recordSubmissionAndCheckAbuse(identity, 'Identical content.');
    expect(third.isAbusive).toBe(true);
    expect(third.occurrences).toBe(3);
  });

  it('normalizes whitespace/case before comparing, so trivial variants still count as repeats', () => {
    const identity = `user-normalize-${Math.random()}`;
    recordSubmissionAndCheckAbuse(identity, 'Identical   Content.');
    recordSubmissionAndCheckAbuse(identity, 'identical content.');
    const third = recordSubmissionAndCheckAbuse(identity, '  IDENTICAL CONTENT.  ');
    expect(third.isAbusive).toBe(true);
  });

  it('does not flag different identities submitting the same content', () => {
    const content = `shared content ${Math.random()}`;
    recordSubmissionAndCheckAbuse('user-a', content);
    recordSubmissionAndCheckAbuse('user-b', content);
    const result = recordSubmissionAndCheckAbuse('user-c', content);
    expect(result.isAbusive).toBe(false);
  });

  it('does not flag the same identity submitting different content repeatedly', () => {
    const identity = `user-varied-${Math.random()}`;
    recordSubmissionAndCheckAbuse(identity, 'First distinct submission.');
    recordSubmissionAndCheckAbuse(identity, 'Second distinct submission.');
    const result = recordSubmissionAndCheckAbuse(identity, 'Third distinct submission.');
    expect(result.isAbusive).toBe(false);
  });
});
