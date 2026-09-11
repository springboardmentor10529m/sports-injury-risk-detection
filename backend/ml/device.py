import logging

logger = logging.getLogger(__name__)

def get_device() -> str:
    """
    Select available computing device with priority:
    1. CUDA (NVIDIA GPU)
    2. MPS (Apple Silicon GPU)
    3. CPU (Fallback)
    """
    try:
        import torch
        if torch.cuda.is_available():
            logger.info("[POSE] Device selected: CUDA")
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("[POSE] Device selected: MPS")
            return "mps"
    except ImportError:
        logger.warning("[POSE] PyTorch not installed or unavailable. Falling back to CPU.")
    except Exception as e:
        logger.warning(f"[POSE] Exception while checking GPU device: {e}. Falling back to CPU.")
        
    logger.info("[POSE] Device selected: CPU")
    return "cpu"
