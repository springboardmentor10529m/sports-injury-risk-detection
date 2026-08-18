import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Video,
  ShieldCheck,
  Activity
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import VideoUpload from "../components/VideoUpload";


function UploadVideo() {

  const navigate = useNavigate();
  const [showUploader, setShowUploader] = useState(true);


  return (
    <DashboardLayout role="athlete">

      <section className="dashboard-header">

        <div>

          <p className="eyebrow">
            KINETIQ ANALYSIS
          </p>

          <h1>
            Upload your movement video.
          </h1>

          <p className="dashboard-description">
            Upload a training or movement video for
            KINETIQ analysis. AI-powered injury risk
            detection will analyze your movement patterns.
          </p>

        </div>


        <button
          className="panel-action"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={16} />
          BACK TO DASHBOARD
        </button>

      </section>


      {/* ANALYSIS INFORMATION */}

      <section className="stats-grid">

        <div className="dashboard-panel">

          <div className="panel-header">

            <div>

              <span className="panel-label">
                VIDEO ANALYSIS
              </span>

              <h2>
                Movement Detection
              </h2>

            </div>

            <Video size={22} />

          </div>

          <p className="metric-description">
            Upload your training footage and KINETIQ
            will prepare it for movement analysis.
          </p>

        </div>


        <div className="dashboard-panel">

          <div className="panel-header">

            <div>

              <span className="panel-label">
                INJURY PREVENTION
              </span>

              <h2>
                Risk Detection
              </h2>

            </div>

            <ShieldCheck size={22} />

          </div>

          <p className="metric-description">
            Movement patterns can be evaluated for
            potential injury-risk indicators.
          </p>

        </div>


        <div className="dashboard-panel">

          <div className="panel-header">

            <div>

              <span className="panel-label">
                PERFORMANCE
              </span>

              <h2>
                Movement Score
              </h2>

            </div>

            <Activity size={22} />

          </div>

          <p className="metric-description">
            Track movement quality and performance
            metrics from your uploaded sessions.
          </p>

        </div>

      </section>


      {/* UPLOAD SECTION */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>

            <span className="panel-label">
              UPLOAD VIDEO
            </span>

            <h2>
              Start Analysis
            </h2>

          </div>

        </div>


        <div
          style={{
            marginTop: "20px",
            padding: "10px 0"
          }}
        >

          <p className="metric-description">
            Supported formats: MP4, MOV, WEBM, AVI, MKV
          </p>


          <button
            className="primary-button"
            onClick={() => setShowUploader(true)}
            style={{
              marginTop: "18px"
            }}
          >
            <Video size={17} />
            UPLOAD VIDEO
          </button>

        </div>

      </section>


      {/* VIDEO UPLOAD MODAL */}

      {showUploader && (

        <VideoUpload
          onClose={() => setShowUploader(false)}
        />

      )}

    </DashboardLayout>
  );
}


export default UploadVideo;