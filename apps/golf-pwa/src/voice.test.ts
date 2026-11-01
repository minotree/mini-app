import { describe, expect, it } from 'vitest';
import { preparationGuide } from './voice';

describe('preparationGuide', () => {
  it('includes the selected club and the side-camera instruction', () => {
    expect(preparationGuide('7i')).toContain('7i');
    expect(preparationGuide('7i')).toContain('공 진행 방향의 측면');
  });
});
