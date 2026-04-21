import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
      <div className="text-7xl font-bold text-error/30">404</div>
      <h1 className="text-xl font-bold text-base-content">Page not found</h1>
      <p className="text-sm text-base-content/50 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/app" className="btn btn-error btn-sm">
        Back to Markets
      </Link>
    </div>
  );
}
