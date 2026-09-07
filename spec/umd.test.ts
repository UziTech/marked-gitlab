import { describe, test } from 'node:test';
import '../lib/index.umd.js';

declare const markedGitlab: unknown;

describe('marked-gitlab umd', () => {
  test('test umd global', (t) => {
    t.assert.equal(typeof markedGitlab, 'function');
  });
});
