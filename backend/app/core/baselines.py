"""
Developmental Baseline Registry and Severity Derivation Rules.

IMPORTANT SCIENTIFIC NOTICE:
The baseline values and severity rules defined in this module are PROVISIONAL
DEVELOPMENTAL STANDARDS for software verification and movement symmetry tracking.
They are NOT clinically validated medical diagnostic thresholds or injury-risk cutoffs.
"""

from dataclasses import dataclass
from enum import StrEnum


class DerivationStrategy(StrEnum):
    Z_SCORE_PRIMARY = "Z_SCORE_PRIMARY"
    PERCENTAGE_PRIMARY = "PERCENTAGE_PRIMARY"
    RANGE_PRIMARY = "RANGE_PRIMARY"


@dataclass
class SeverityRuleConfig:
    """
    Configurable severity derivation thresholds.
    Allows adjusting statistical boundaries without modifying detection logic.
    """

    strategy: DerivationStrategy = DerivationStrategy.Z_SCORE_PRIMARY
    # Z-Score thresholds (when std_dev > 0)
    z_score_mild: float = 1.0
    z_score_moderate: float = 2.0
    z_score_high: float = 3.0

    # Percentage deviation thresholds (when mean != 0)
    pct_mild: float = 15.0
    pct_moderate: float = 25.0
    pct_high: float = 40.0

    # Elevation on range boundary violation
    elevate_on_range_violation: bool = True


@dataclass(frozen=True)
class MovementBaseline:
    """Configurable baseline representation for a kinematic movement metric."""

    metric_key: str
    display_name: str
    category: str
    unit: str
    mean: float
    std_dev: float
    min_norm: float
    max_norm: float
    baseline_type: str = "DEVELOPMENTAL"
    is_provisional: bool = True
    description: str = ""
    notes: str = "Developmental reference for movement symmetry and planar kinematic tracking."


# Default Developmental Baseline Configuration Registry
DEFAULT_DEVELOPMENTAL_BASELINES: dict[str, MovementBaseline] = {
    "knee_flexion_rom": MovementBaseline(
        metric_key="knee_flexion_rom",
        display_name="Knee Flexion ROM",
        category="Lower Limb Kinematics",
        unit="°",
        mean=120.0,
        std_dev=15.0,
        min_norm=90.0,
        max_norm=145.0,
        description="Range of motion between knee extension and peak flexion during dynamic movement.",
    ),
    "peak_knee_flexion": MovementBaseline(
        metric_key="peak_knee_flexion",
        display_name="Peak Knee Flexion",
        category="Lower Limb Kinematics",
        unit="°",
        mean=125.0,
        std_dev=12.0,
        min_norm=95.0,
        max_norm=150.0,
        description="Maximum observed sagittal knee flexion angle.",
    ),
    "hip_flexion_rom": MovementBaseline(
        metric_key="hip_flexion_rom",
        display_name="Hip Flexion ROM",
        category="Lower Limb Kinematics",
        unit="°",
        mean=90.0,
        std_dev=15.0,
        min_norm=65.0,
        max_norm=120.0,
        description="Range of motion between hip neutral and peak flexion.",
    ),
    "ankle_dorsiflexion_rom": MovementBaseline(
        metric_key="ankle_dorsiflexion_rom",
        display_name="Ankle Sagittal ROM",
        category="Lower Limb Kinematics",
        unit="°",
        mean=35.0,
        std_dev=8.0,
        min_norm=20.0,
        max_norm=55.0,
        description="Range of motion across ankle flexion/extension.",
    ),
    "trunk_lean_max": MovementBaseline(
        metric_key="trunk_lean_max",
        display_name="Trunk Forward Lean (Peak)",
        category="Trunk Kinematics",
        unit="°",
        mean=20.0,
        std_dev=8.0,
        min_norm=0.0,
        max_norm=35.0,
        description="Maximum sagittal forward lean angle relative to vertical axis.",
    ),
    "trunk_lateral_tilt_max": MovementBaseline(
        metric_key="trunk_lateral_tilt_max",
        display_name="Trunk Lateral Tilt (Peak)",
        category="Trunk Kinematics",
        unit="°",
        mean=5.0,
        std_dev=3.0,
        min_norm=0.0,
        max_norm=12.0,
        description="Maximum frontal plane lateral tilt angle relative to horizontal shoulder alignment.",
    ),
    "knee_valgus_proxy_max": MovementBaseline(
        metric_key="knee_valgus_proxy_max",
        display_name="Frontal Plane Knee Valgus Proxy (Peak)",
        category="Frontal Alignment",
        unit="°",
        mean=8.0,
        std_dev=4.0,
        min_norm=0.0,
        max_norm=15.0,
        description="Estimated frontal plane knee medial displacement deviation proxy.",
    ),
    "knee_flexion_asymmetry": MovementBaseline(
        metric_key="knee_flexion_asymmetry",
        display_name="Bilateral Knee Flexion Asymmetry",
        category="Bilateral Symmetry",
        unit="%",
        mean=6.0,
        std_dev=4.0,
        min_norm=0.0,
        max_norm=12.0,
        description="Mean absolute bilateral difference percentage between left and right knee flexion.",
    ),
    "hip_flexion_asymmetry": MovementBaseline(
        metric_key="hip_flexion_asymmetry",
        display_name="Bilateral Hip Flexion Asymmetry",
        category="Bilateral Symmetry",
        unit="%",
        mean=7.0,
        std_dev=4.5,
        min_norm=0.0,
        max_norm=14.0,
        description="Mean absolute bilateral difference percentage between left and right hip flexion.",
    ),
    "knee_valgus_asymmetry": MovementBaseline(
        metric_key="knee_valgus_asymmetry",
        display_name="Bilateral Knee Valgus Asymmetry",
        category="Bilateral Symmetry",
        unit="%",
        mean=8.0,
        std_dev=5.0,
        min_norm=0.0,
        max_norm=15.0,
        description="Mean absolute bilateral difference percentage in frontal knee alignment proxy.",
    ),
    "peak_angular_velocity": MovementBaseline(
        metric_key="peak_angular_velocity",
        display_name="Peak Knee Angular Velocity",
        category="Dynamic Velocity",
        unit="°/s",
        mean=450.0,
        std_dev=100.0,
        min_norm=200.0,
        max_norm=750.0,
        description="Maximum rate of change of knee joint angle.",
    ),
}


class BaselineRegistry:
    """Registry providing access, rule configuration, and runtime custom baselines."""

    def __init__(
        self,
        custom_baselines: dict[str, MovementBaseline] | None = None,
        rule_config: SeverityRuleConfig | None = None,
    ):
        self._baselines = dict(DEFAULT_DEVELOPMENTAL_BASELINES)
        if custom_baselines:
            self._baselines.update(custom_baselines)
        self.rule_config = rule_config or SeverityRuleConfig()

    def get_baseline(self, metric_key: str) -> MovementBaseline | None:
        """Retrieve baseline by metric key."""
        return self._baselines.get(metric_key)

    def get_all_baselines(self) -> dict[str, MovementBaseline]:
        """Retrieve full map of registered developmental baselines."""
        return dict(self._baselines)

    def register_baseline(self, baseline: MovementBaseline) -> None:
        """Register or override a baseline configuration at runtime."""
        self._baselines[baseline.metric_key] = baseline

    def set_rule_config(self, config: SeverityRuleConfig) -> None:
        """Update severity derivation rules."""
        self.rule_config = config


_default_registry: BaselineRegistry | None = None


def get_baseline_registry() -> BaselineRegistry:
    """Retrieve singleton baseline registry instance."""
    global _default_registry
    if _default_registry is None:
        _default_registry = BaselineRegistry()
    return _default_registry
