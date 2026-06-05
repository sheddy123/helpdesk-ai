import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome back, {user?.userName}
      </h1>
      <p className="mt-1 text-gray-500">Dashboard coming soon.</p>
    </div>
  );
}
