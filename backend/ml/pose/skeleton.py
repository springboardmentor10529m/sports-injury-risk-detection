"""
COCO 17 Keypoints Topology and Connections
Centralized definition for RTMPose-M inference and visualization.
"""

COCO_KEYPOINT_NAMES = [
    "nose",           # 0
    "left_eye",       # 1
    "right_eye",      # 2
    "left_ear",       # 3
    "right_ear",      # 4
    "left_shoulder",  # 5
    "right_shoulder", # 6
    "left_elbow",     # 7
    "right_elbow",    # 8
    "left_wrist",     # 9
    "right_wrist",    # 10
    "left_hip",       # 11
    "right_hip",      # 12
    "left_knee",      # 13
    "right_knee",     # 14
    "left_ankle",     # 15
    "right_ankle"     # 16
]

KEYPOINT_NAMES = COCO_KEYPOINT_NAMES
KEYPOINT_NAME_TO_INDEX = {name: idx for idx, name in enumerate(COCO_KEYPOINT_NAMES)}
KEYPOINT_INDEX_TO_NAME = {idx: name for idx, name in enumerate(COCO_KEYPOINT_NAMES)}

# COCO 17 Anatomical Skeleton Connections (16 Pairs of Keypoint Indices)
SKELETON_CONNECTIONS = [
    (0, 1),   # nose -> left_eye
    (0, 2),   # nose -> right_eye
    (1, 3),   # left_eye -> left_ear
    (2, 4),   # right_eye -> right_ear
    (5, 6),   # left_shoulder -> right_shoulder
    (5, 7),   # left_shoulder -> left_elbow
    (7, 9),   # left_elbow -> left_wrist
    (6, 8),   # right_shoulder -> right_elbow
    (8, 10),  # right_elbow -> right_wrist
    (5, 11),  # left_shoulder -> left_hip
    (6, 12),  # right_shoulder -> right_hip
    (11, 12), # left_hip -> right_hip
    (11, 13), # left_hip -> left_knee
    (13, 15), # left_knee -> left_ankle
    (12, 14), # right_hip -> right_knee
    (14, 16)  # right_knee -> right_ankle
]

# Connection colors in BGR for visual distinction (Left = Teal/Blue, Right = Coral/Red, Center = Gold)
CONNECTION_COLORS = [
    (255, 200, 0), # 0-1 nose -> left_eye
    (255, 200, 0), # 0-2 nose -> right_eye
    (255, 200, 0), # 1-3 left_eye -> left_ear
    (255, 200, 0), # 2-4 right_eye -> right_ear
    (0, 255, 255), # 5-6 shoulders
    (255, 128, 0), # 5-7 left upper arm
    (255, 128, 0), # 7-9 left lower arm
    (0, 128, 255), # 6-8 right upper arm
    (0, 128, 255), # 8-10 right lower arm
    (255, 128, 0), # 5-11 left torso
    (0, 128, 255), # 6-12 right torso
    (0, 255, 255), # 11-12 hips
    (255, 0, 128), # 11-13 left thigh
    (255, 0, 128), # 13-15 left calf
    (0, 0, 255),   # 12-14 right thigh
    (0, 0, 255)    # 14-16 right calf
]
