"""Biomechanical analysis service stub."""

from abc import ABC, abstractmethod


class BiomechanicalServiceBase(ABC):
    @abstractmethod
    def analyze_joint_angles(self, poses: list) -> dict:
        """Analyze joint angles across time."""
        pass

    @abstractmethod
    def calculate_rom(self, poses: list) -> dict:
        """Calculate range of motion for key joints."""
        pass

    @abstractmethod
    def assess_symmetry(self, poses: list) -> float:
        """Assess left-right symmetry index."""
        pass

    @abstractmethod
    def estimate_forces(self, poses: list) -> dict:
        """Estimate dynamic forces (e.g. landing impact)."""
        pass

    @abstractmethod
    def evaluate_posture(self, poses: list) -> dict:
        """Evaluate overall posture stability."""
        pass


class BiomechanicalService(BiomechanicalServiceBase):
    def analyze_joint_angles(self, poses: list) -> dict:
        raise NotImplementedError("Phase 3 implementation")

    def calculate_rom(self, poses: list) -> dict:
        raise NotImplementedError("Phase 3 implementation")

    def assess_symmetry(self, poses: list) -> float:
        raise NotImplementedError("Phase 3 implementation")

    def estimate_forces(self, poses: list) -> dict:
        raise NotImplementedError("Phase 3 implementation")

    def evaluate_posture(self, poses: list) -> dict:
        raise NotImplementedError("Phase 3 implementation")
