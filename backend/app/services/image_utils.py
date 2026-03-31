import base64
import os
import cv2

def encode_image_base64(filepath: str) -> str:
    """Read an image file and return its base64 string."""
    try:
        with open(filepath, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception:
        return ""

def extract_video_frames(filepath: str, max_frames: int = 3) -> list[str]:
    """Extract equally spaced frames from a video and return them as base64 JPEG strings."""
    try:
        cap = cv2.VideoCapture(filepath)
        if not cap.isOpened():
            return []
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            return []
            
        step = max(1, total_frames // (max_frames + 1))
        frames_b64 = []
        
        for i in range(1, max_frames + 1):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * step)
            ret, frame = cap.read()
            if ret:
                # Resize the image to speed up API processing and save tokens
                height, width = frame.shape[:2]
                max_dim = 600
                if max(height, width) > max_dim:
                    scale = max_dim / max(height, width)
                    frame = cv2.resize(frame, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
                
                success, buffer = cv2.imencode('.jpg', frame)
                if success:
                    frames_b64.append(base64.b64encode(buffer).decode('utf-8'))
                    
        cap.release()
        return frames_b64
    except Exception:
        return []
