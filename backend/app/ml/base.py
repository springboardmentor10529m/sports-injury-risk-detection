"""Base ML Model Interface."""
from abc import ABC, abstractmethod

class BaseModel(ABC):
    """Abstract base class for all ML models in SafeMove."""
    
    def __init__(self, version: str):
        self.version = version

    @abstractmethod
    def load_model(self, model_path: str):
        """Load model weights/config from path."""
        pass

    @abstractmethod
    def predict(self, input_data: any) -> any:
        """Run inference on the model."""
        pass

    @abstractmethod
    def evaluate(self, dataset: any) -> dict:
        """Evaluate the model on a test set."""
        pass

    def get_model_info(self) -> dict:
        """Return metadata about the loaded model."""
        return {
            "version": self.version,
            "class": self.__class__.__name__
        }
