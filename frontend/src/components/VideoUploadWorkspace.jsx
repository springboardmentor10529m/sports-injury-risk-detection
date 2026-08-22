import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import { EmptyState, Panel } from './DashboardUI'
import './VideoUploadWorkspace.css'

const EXERCISE_TYPES = [
  'Countermovement Jump (CMJ)',
  'Single Leg Hop',
  'Barbell Squat',
  'Sprint Acceleration',
  'Cut / Change of Direction',
  'Overhead Throw / Serve',
  'Landing Biomechanics',
  'Custom Movement',
]

const VIDEO_STORAGE_KEY = 'sports-injury-video-uploads'

function readUploadedVideos() {
  try {
    const data = JSON.parse(localStorage.getItem(VIDEO_STORAGE_KEY))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveUploadedVideos(videos) {
  try {
    localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(videos))
  } catch (err) {
    console.error('Failed to save video uploads', err)
  }
}

export default function VideoUploadWorkspace() {
  const { currentUser, userRole } = useAuth()
  const fileInputRef = useRef(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [title, setTitle] = useState('')
  const [exerciseType, setExerciseType] = useState(EXERCISE_TYPES[0])
  const [targetAthlete, setTargetAthlete] = useState(
    userRole === ROLES.ATHLETE ? currentUser?.name || 'Self' : ''
  )
  const [notes, setNotes] = useState('')
  
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [uploadedVideos, setUploadedVideos] = useState(readUploadedVideos)

  // Scope filter: Athlete sees their own videos, Coach/Physio see videos uploaded in their org scope
  const visibleVideos = uploadedVideos.filter((item) => {
    if (userRole === ROLES.ATHLETE) {
      return item.uploaderId === currentUser?.id || item.targetAthlete?.toLowerCase() === currentUser?.name?.toLowerCase()
    }
    return true
  })

  const handleFileChange = (file) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (.mp4, .mov, .avi, .webm).')
      return
    }
    setErrorMessage('')
    setSelectedFile(file)
    setTitle(file.name.replace(/\.[^/.]+$/, ''))
    
    // Create object URL for client preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0])
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = () => {
    setIsDragActive(false)
  }

  const handleResetFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    setTitle('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadSubmit = (event) => {
    event.preventDefault()
    if (!selectedFile) {
      setErrorMessage('Please select a video file before uploading.')
      return
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a title for the video.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setErrorMessage('')
    setSuccessMessage('')

    // Simulate file upload progress
    const interval = setInterval(() => {
      setUploadProgress((current) => {
        if (current >= 100) {
          clearInterval(interval)
          return 100
        }
        return current + 20
      })
    }, 200)

    setTimeout(() => {
      clearInterval(interval)
      setUploadProgress(100)

      const newRecord = {
        id: `vid-${Date.now()}`,
        title: title.trim(),
        exerciseType,
        targetAthlete: targetAthlete.trim() || (currentUser?.name || 'Athlete'),
        notes: notes.trim(),
        fileName: selectedFile.name,
        fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
        videoUrl: previewUrl, // Object URL or mock blob reference
        uploadedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        uploaderId: currentUser?.id,
        uploaderName: currentUser?.name,
        uploaderRole: userRole,
        status: 'Uploaded / Pending ML Processing',
      }

      const updatedList = [newRecord, ...uploadedVideos]
      setUploadedVideos(updatedList)
      saveUploadedVideos(updatedList)

      setIsUploading(false)
      setSuccessMessage('Video uploaded successfully. Video processing and ML injury risk analysis will be executed in a future backend update.')
      
      // Reset form fields
      setSelectedFile(null)
      setPreviewUrl(null)
      setTitle('')
      setNotes('')
      if (userRole !== ROLES.ATHLETE) setTargetAthlete('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }, 1200)
  }

  const handleDeleteVideo = (idToDelete) => {
    const updated = uploadedVideos.filter((v) => v.id !== idToDelete)
    setUploadedVideos(updated)
    saveUploadedVideos(updated)
  }

  return (
    <div className="video-upload-container">
      {/* Notice Banner adhering to Milestone Rules */}
      <div className="notice-banner" role="status">
        <span className="notice-banner-icon">ℹ</span>
        <div>
          <strong>Video Upload Workflow</strong>
          <p className="mb-0">
            Upload athletic movement recordings for evaluation. Note: Automated video processing and ML-based injury risk predictions will be enabled in a future backend milestone update.
          </p>
        </div>
      </div>

      {/* Upload Form Panel */}
      <Panel title="Upload New Movement Video" description="Select a movement recording and configure exercise metadata.">
        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}
        {successMessage && <div className="alert alert-success py-2 mb-3">{successMessage}</div>}

        <form onSubmit={handleUploadSubmit}>
          <div className="video-upload-grid">
            {/* File Dropzone or Preview */}
            <div>
              {!previewUrl ? (
                <div
                  className={`dropzone ${isDragActive ? 'active' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="dropzone-icon">🎥</div>
                  <div className="dropzone-text">Drag and drop your video file here</div>
                  <div className="dropzone-subtext">Supports MP4, MOV, AVI, WEBM (Max 500MB)</div>
                  <button type="button" className="btn btn-outline-primary btn-sm mt-3">
                    Browse Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                    className="d-none"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="video-preview-wrapper">
                  <video src={previewUrl} controls className="video-preview-element" />
                  <button type="button" className="change-video-btn" onClick={handleResetFile}>
                    Change Video
                  </button>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="d-flex flex-column gap-3">
              <div>
                <label className="form-label font-weight-bold">Video Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. CMJ Assessment - Trial 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  required
                />
              </div>

              <div>
                <label className="form-label">Exercise / Movement Type</label>
                <select
                  className="form-select"
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                  disabled={isUploading}
                >
                  {EXERCISE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {userRole !== ROLES.ATHLETE ? (
                <div>
                  <label className="form-label">Target Athlete</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter athlete name or ID"
                    value={targetAthlete}
                    onChange={(e) => setTargetAthlete(e.target.value)}
                    disabled={isUploading}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="form-label">Athlete</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentUser?.name || 'Self'}
                    disabled
                  />
                </div>
              )}

              <div>
                <label className="form-label">Notes / Observations</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Optional movement notes or biomechanical observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="upload-progress-container">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Uploading video...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="upload-progress-bar">
                    <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-2">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? 'Uploading Video...' : 'Upload Video'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </Panel>

      {/* Uploaded Video Records Library */}
      <Panel
        title="Uploaded Movement Videos"
        description="Records of submitted movement videos awaiting future ML video processing."
      >
        {visibleVideos.length === 0 ? (
          <EmptyState
            title="No video analysis records are available"
            description="Upload a movement video above to begin building your analysis record library."
          />
        ) : (
          <div className="video-cards-grid">
            {visibleVideos.map((vid) => (
              <div key={vid.id} className="video-card">
                {vid.videoUrl ? (
                  <video src={vid.videoUrl} controls className="video-card-player" />
                ) : (
                  <div className="video-card-player d-flex align-items-center justify-content-center text-white">
                    <span>▶ No Preview Available</span>
                  </div>
                )}
                <div className="video-card-body">
                  <h4 className="video-card-title">{vid.title}</h4>
                  <div className="video-card-meta">
                    <span className="exercise-badge">{vid.exerciseType}</span>
                    <span className="status-badge-pending">{vid.status}</span>
                  </div>
                  {vid.notes && <p className="small text-muted mb-1">{vid.notes}</p>}
                  <div className="video-card-footer">
                    <div>
                      <div>👤 {vid.targetAthlete}</div>
                      <small className="text-muted">{vid.uploadedAt}</small>
                    </div>
                    <button
                      type="button"
                      className="delete-video-btn"
                      onClick={() => handleDeleteVideo(vid.id)}
                      title="Delete video record"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
