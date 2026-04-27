import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useSession } from './stores/session';

test('renders home placeholder when authenticated', () => {
  useSession.setState({
    jwt: 'fake-jwt',
    kid: { id: 'fake-id', display_name: 'TestKid' },
    isAdmin: false,
  });
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Home/i)).toBeInTheDocument();
});
