import React from 'react';

function App() {
  return (
    <div style={{padding: 24, fontFamily: 'Arial'}}>
      <h1>Sports Injury Risk Detection (Frontend - Skeleton)</h1>
      <p>This is a minimal frontend with no AI or DB integration.</p>
      <ul>
        <li>Health check: <a href="/api/health">/api/health</a> (from backend)</li>
        <li>Info: <a href="/api/info">/api/info</a></li>
      </ul>
    </div>
  );
}

export default App;
