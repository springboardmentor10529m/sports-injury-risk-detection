import cv2
import numpy as np
import os

test_frame = np.zeros((480, 640, 3), dtype=np.uint8)

codecs_to_test = ['avc1', 'H264', 'X264', 'mp4v', 'XVID']

print("Testing OpenCV VideoWriter FourCC codecs:")
for codec in codecs_to_test:
    out_file = f"test_{codec}.mp4"
    try:
        fourcc = cv2.VideoWriter_fourcc(*codec)
        writer = cv2.VideoWriter(out_file, fourcc, 30.0, (640, 480))
        if writer.isOpened():
            for _ in range(10):
                writer.write(test_frame)
            writer.release()
            size = os.path.getsize(out_file) if os.path.exists(out_file) else 0
            print(f"  Codec '{codec}': SUCCESS (Created {out_file}, size: {size} bytes)")
        else:
            print(f"  Codec '{codec}': FAILED to open writer")
    except Exception as e:
        print(f"  Codec '{codec}': EXCEPTION {e}")

    if os.path.exists(out_file):
        os.remove(out_file)
