import os
import cv2

processed_dir = os.path.abspath("uploads/processed")
if os.path.exists(processed_dir):
    for fname in os.listdir(processed_dir):
        if fname.endswith(".mp4"):
            filepath = os.path.join(processed_dir, fname)
            print(f"Inspecting: {fname}")
            cap = cv2.VideoCapture(filepath)
            if not cap.isOpened():
                print(f"  Cannot open {fname}")
                continue
            
            fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
            fourcc_str = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)])
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            print(f"  Current FourCC: {fourcc_str}, Resolution: {width}x{height}, FPS: {fps}")

            frames = []
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                frames.append(frame)
            cap.release()

            if not frames:
                print(f"  No frames read from {fname}")
                continue

            temp_path = os.path.join(processed_dir, f"temp_{fname}")
            written = False
            for fourcc_name in ['avc1', 'H264', 'X264', 'mp4v']:
                fourcc = cv2.VideoWriter_fourcc(*fourcc_name)
                out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
                if out.isOpened():
                    for f in frames:
                        out.write(f)
                    out.release()
                    if os.path.exists(temp_path) and os.path.getsize(temp_path) > 100:
                        os.replace(temp_path, filepath)
                        print(f"  SUCCESS: Converted {fname} using codec '{fourcc_name}'")
                        written = True
                        break
                    else:
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
            if not written:
                print(f"  WARNING: Could not convert {fname} with H264 codecs")
