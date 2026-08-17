import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";

import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";
import Loading from "../components/Loading";

import { getAthletes } from "../api/athletes";

function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAthletes() {
      try {
        const data = await getAthletes();

        setAthletes(
          Array.isArray(data)
            ? data
            : data.items || []
        );
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to load athletes."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAthletes();
  }, []);

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete.full_name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      athlete.email
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="dashboard">
        <div className="page-header">
          <div>
            <span className="eyebrow">
              ATHLETES
            </span>

            <h1>Athlete Management</h1>

            <p>
              Monitor athletes and their assessment
              history.
            </p>
          </div>
        </div>

        <section className="panel">
          <div className="search-box">
            <Search size={18} />

            <input
              placeholder="Search athletes..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          {loading && <Loading />}

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="athlete-table">
              <div className="table-header">
                <span>Athlete</span>
                <span>Email</span>
                <span>Risk</span>
              </div>

              {filteredAthletes.length === 0 ? (
                <div className="empty-state">
                  <UserRound size={30} />
                  <p>
                    No athletes found.
                  </p>
                </div>
              ) : (
                filteredAthletes.map(
                  (athlete) => (
                    <div
                      className="table-row"
                      key={athlete.id}
                    >
                      <div className="person-cell">
                        <div className="avatar">
                          {(athlete.full_name ||
                            "A").charAt(0)}
                        </div>

                        <strong>
                          {athlete.full_name ||
                            "Unnamed Athlete"}
                        </strong>
                      </div>

                      <span>
                        {athlete.email || "—"}
                      </span>

                      <RiskBadge level="Low" />
                    </div>
                  )
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Athletes;