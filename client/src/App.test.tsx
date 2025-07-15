import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AIS Tracking Dashboard', () => {
  render(<App />);
  const headingElement = screen.getByText(/AIS Tracking Dashboard/i);
  expect(headingElement).toBeInTheDocument();
});
