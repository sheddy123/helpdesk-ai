import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-base font-semibold text-gray-900">Helpdesk AI</span>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'} transition-colors`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/tickets"
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'} transition-colors`
                }
              >
                Tickets
              </NavLink>
              {user?.roles.includes('Admin') && (
                <NavLink
                  to="/users"
                  className={({ isActive }) =>
                    `text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'} transition-colors`
                  }
                >
                  Users
                </NavLink>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user.userName}</span>
                <button
                  onClick={logout}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
