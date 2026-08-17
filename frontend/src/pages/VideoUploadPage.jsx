import React, { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:8000/api/v1";

export default function VideoUploadSection({ userEmail }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  // Fetch past analysis records on component load
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/videos/history`, {
        headers: {
          Authorization: `Bearer bearer-token-${userEmail}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load video history:", err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a video file first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/videos/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer bearer-token-${userEmail}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Upload failed");
      }

      const result = await response.json();
      setAnalysisResult(result);
      setSelectedFile(null);
      fetchHistory(); // Refresh history list
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-xl font-bold">Biomechanical Motion Analysis</h2>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          accept="video/mp4,video/mov,video/avi"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          type="submit"
          disabled={isUploading || !selectedFile}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
        >
          {isUploading ? "Analyzing Motion..." : "Upload Video for Analysis"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Latest Upload Results */}
      {analysisResult && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800">
            Latest Assessment Result
          </h3>
          <p className="mt-1">
            <strong>Risk Status:</strong>{" "}
            <span
              className={
                analysisResult.risk_status === "High Risk"
                  ? "text-red-600 font-bold"
                  : analysisResult.risk_status === "Moderate Risk"
                    ? "text-yellow-600 font-bold"
                    : "text-green-600 font-bold"
              }
            >
              {analysisResult.risk_status} ({analysisResult.risk_score}%)
            </span>
          </p>
        </div>
      )}

      {/* Video History List */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Previous Uploads</h3>
        {history.length === 0 ? (
          <p className="text-gray-400 text-sm">No video assessments found.</p>
        ) : (
          <ul className="divide-y divide-gray-200 text-sm">
            {history.map((item) => (
              <li
                key={item.id}
                className="py-2 flex justify-between items-center"
              >
                <span>{item.filename}</span>
                <span className="font-medium">
                  {item.risk_status} ({item.risk_score}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
