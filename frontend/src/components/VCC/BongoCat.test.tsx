import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BongoCat from './BongoCat';

describe('BongoCat Component', () => {
  it('renders correctly with default state', () => {
    const { container } = render(<BongoCat isTyping={false} />);
    // Verify the container exists by looking for an SVG element
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<BongoCat className="custom-test-class" />);
    const div = container.querySelector('.custom-test-class');
    expect(div).toBeInTheDocument();
  });
});