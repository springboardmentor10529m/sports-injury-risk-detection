import { useRef, useState } from "react";

import {
  Upload,
  X,
  Video,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { uploadVideo } from "../api/video";


function VideoUpload({ onClose }) {

  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");


  function handleFileChange(event) {

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setSuccess("");
    setError("");
  }


  async function handleUpload() {

    if (!file) {

      setError(
        "Please select a video first."
      );

      return;
    }

    setUploading(true);
    setSuccess("");
    setError("");


    try {

      const result =
        await uploadVideo(file);

      console.log(
        "Video upload response:",
        result
      );

      setSuccess(
        "Video uploaded successfully."
      );

    } catch (err) {

      console.error(
        "Video upload error:",
        err
      );

      setError(
        err.message ||
        "Video upload failed."
      );

    } finally {

      setUploading(false);

    }
  }


  return (

    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#101512",
          border: "1px solid rgba(182,255,74,0.18)",
          padding: "30px",
          position: "relative"
        }}
      >

        {/* CLOSE BUTTON */}

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "none",
            border: "none",
            color: "#9aa39b",
            cursor: "pointer"
          }}
        >

          <X size={20} />

        </button>


        {/* HEADER */}

        <span
          style={{
            color: "#b6ff4a",
            fontFamily: "DM Mono, monospace",
            fontSize: "10px",
            letterSpacing: "0.12em"
          }}
        >
          VIDEO ANALYSIS
        </span>


        <h2
          style={{
            marginTop: "10px"
          }}
        >
          Upload Training Video
        </h2>


        <p
          style={{
            marginTop: "8px",
            color: "#7f8981",
            fontFamily: "DM Mono, monospace",
            fontSize: "10px",
            lineHeight: "1.6"
          }}
        >
          Upload a training or movement video
          for processing.
        </p>


        {/* UPLOAD AREA */}

        <div
          onClick={() =>
            fileInputRef.current?.click()
          }
          style={{
            marginTop: "25px",
            border: "1px dashed rgba(182,255,74,0.3)",
            padding: "35px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: "rgba(182,255,74,0.02)"
          }}
        >

          <Upload
            size={28}
            color="#b6ff4a"
          />


          <p
            style={{
              marginTop: "15px",
              color: "#dce4dc"
            }}
          >
            Click to select a video
          </p>


          <p
            style={{
              marginTop: "7px",
              color: "#68716a",
              fontFamily: "DM Mono, monospace",
              fontSize: "9px"
            }}
          >
            MP4 · MOV · AVI · MKV · WEBM
          </p>


          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{
              display: "none"
            }}
          />

        </div>


        {/* SELECTED FILE */}

        {file && (

          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              background: "#070908",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >

            <Video
              size={18}
              color="#b6ff4a"
            />


            <div
              style={{
                flex: 1,
                minWidth: 0
              }}
            >

              <div
                style={{
                  color: "#e7ece7",
                  fontSize: "12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {file.name}
              </div>


              <div
                style={{
                  marginTop: "4px",
                  color: "#68716a",
                  fontFamily: "DM Mono, monospace",
                  fontSize: "9px"
                }}
              >
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>

            </div>

          </div>

        )}


        {/* SUCCESS MESSAGE */}

        {success && (

          <div
            style={{
              marginTop: "18px",
              padding: "12px",
              background: "rgba(182,255,74,0.06)",
              border: "1px solid rgba(182,255,74,0.2)",
              color: "#b6ff4a",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              fontFamily: "DM Mono, monospace",
              fontSize: "10px"
            }}
          >

            <CheckCircle size={15} />

            {success}

          </div>

        )}


        {/* ERROR MESSAGE */}

        {error && (

          <div
            style={{
              marginTop: "18px",
              padding: "12px",
              background: "rgba(255,80,80,0.06)",
              border: "1px solid rgba(255,80,80,0.2)",
              color: "#ff8585",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              fontFamily: "DM Mono, monospace",
              fontSize: "10px"
            }}
          >

            <AlertCircle size={15} />

            {error}

          </div>

        )}


        {/* BUTTONS */}

        <div
          style={{
            marginTop: "25px",
            display: "flex",
            gap: "10px"
          }}
        >

          <button
            className="primary-button"
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex: 1,
              justifyContent: "center",
              opacity:
                !file || uploading
                  ? 0.5
                  : 1
            }}
          >

            {uploading
              ? "UPLOADING..."
              : "UPLOAD VIDEO →"
            }

          </button>


          <button
            onClick={onClose}
            style={{
              padding: "0 18px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#8b948d",
              cursor: "pointer"
            }}
          >
            CANCEL
          </button>

        </div>

      </div>

    </div>

  );
}


export default VideoUpload;