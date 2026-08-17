import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="page-center">
      <div className="not-found">
        <h1>404</h1>

        <h2>Page not found</h2>

        <p>
          The page you're looking for doesn't exist.
        </p>

        <Link
          to="/"
          className="primary-button"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}

export default NotFound;