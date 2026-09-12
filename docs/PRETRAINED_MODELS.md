# Pretrained Models Documentation

This document describes all pretrained computer vision and deep learning models integrated into the Sports Biomechanics & Injury Risk Screening platform.

---

## 1. Primary Pose Estimation: RTMPose-M (ONNX)

- **Model**: RTMPose-M (Real-Time Multi-Person Pose Estimation - Medium)
- **Architecture**: SimCC (Simulated Coordinate Classification) with CSPNeXt backbone
- **Source**: OpenMMLab / MMPose ([GitHub: open-mmlab/mmpose](https://github.com/open-mmlab/mmpose))
- **Weights URL**: [OpenMMLab Model Zoo - RTMPose-M](https://download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/rtmpose-m_simcc-body7_pt-body7_420e-256x192-e48f03d0_20230504.onnx)
- **Detector Weights URL**: [YOLOX-M HumanArt Checkpoint](https://download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/yolox_m_8xb8-300e_humanart-c2c7a14a.onnx)
- **Version**: 1.0.0 (SimCC Body7 420e 256x192)
- **License**: Apache License 2.0
- **Input Format**: BGR Image Frame `(H, W, 3)` uint8; normalized and scaled to `256x192` per detected person crop
- **Output Keypoints**: 17 Standard COCO Keypoints:
  1. Nose
  2. Left Eye
  3. Right Eye
  4. Left Ear
  5. Right Ear
  6. Left Shoulder
  7. Right Shoulder
  8. Left Elbow
  9. Right Elbow
  10. Left Wrist
  11. Right Wrist
  12. Left Hip
  13. Right Hip
  14. Left Knee
  15. Right Knee
  16. Left Ankle
  17. Right Ankle
- **Inference Framework**: ONNX Runtime (`onnxruntime>=1.16.0`) with execution providers for CPU and GPU (CUDA/DirectML)
- **Local Artifact Locations**:
  - `models/pretrained/pose/rtmpose-m_simcc-body7_pt-body7_420e-256x192-e48f03d0_20230504.onnx` (54.3 MB)
  - `models/pretrained/pose/yolox_m_8xb8-300e_humanart-c2c7a14a.onnx` (101.4 MB)
- **Performance Characteristics**:
  - Latency: ~12-18 ms per frame on GPU, ~35-50 ms on CPU
  - Accuracy: State-of-the-art COCO validation AP (>75.8 mAP)

---

## 2. Fallback Pose Estimator: Keypoint R-CNN (Torchvision)

- **Model**: Keypoint R-CNN (ResNet-50 FPN)
- **Source**: PyTorch / Torchvision (`torchvision.models.detection.keypointrcnn_resnet50_fpn`)
- **Weights**: `KeypointRCNN_ResNet50_FPN_Weights.DEFAULT`
- **Version**: PyTorch 2.x / Torchvision 0.15+
- **License**: BSD 3-Clause License
- **Input Format**: Normalized Float Tensor `[3, H, W]` in range `[0.0, 1.0]`
- **Output Keypoints**: 17 COCO Keypoints `[x, y, confidence]` with person detection score
- **Inference Framework**: PyTorch native (`torch.jit` / `torch.no_grad()`)
- **Fallback Trigger**: Automatically engaged if ONNX Runtime encounters incompatible hardware execution providers.

---

## 3. Pretrained Pose Model Verification

Both models have been validated on synthetic and live video frames:
- Coordinates are automatically transformed back to the original full-frame camera dimensions.
- Bounding boxes are derived from active joint detections with anatomical sanity validation.
- One-Euro temporal filters reduce high-frequency landmark jitter between adjacent frames.
