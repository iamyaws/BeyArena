import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useSession } from './stores/session';

test('renders without crashing when authenticated', () => {
  useSession.setState({
    jwt: 'fake-jwt',
    kid: { id: 'fake-id', display_name: 'TestKid' },
    isAdmin: false,
  });
  const queryClient = new QueryClient();
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(container).toBeTruthy();
});
