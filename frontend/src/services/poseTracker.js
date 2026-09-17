import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let poseLandmarkerInstance = null;
let initPromise = null;

export async function getPoseLandmarker() {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
      );

      let landmarker = null;
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
      } catch (localErr) {
        console.warn("Local pose model load failed, trying CDN:", localErr);
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
      }

      poseLandmarkerInstance = landmarker;
      return landmarker;
    } catch (err) {
      console.error("Failed to initialize MediaPipe Pose Landmarker:", err);
      return null;
    }
  })();

  return initPromise;
}

export function calculate2DAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

  if (magBA * magBC === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export const POSE_CONNECTIONS = [
  // Torso
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // Left Arm
  [11, 13],
  [13, 15],
  // Right Arm
  [12, 14],
  [14, 16],
  // Left Leg
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  // Right Leg
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
];
