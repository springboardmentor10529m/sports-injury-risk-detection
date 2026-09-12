# Sports Biomechanics & Injury Dataset Registry

This catalog documents the datasets identified, verified, and integrated into the Sports Biomechanics & Injury Risk Screening platform.

In accordance with project ethics and regulatory compliance:
- Standard pose datasets (e.g. COCO, MPII) are strictly classified as **Pose / Movement Reconstruction** datasets and **never** used to synthesize fake clinical injury labels.
- Supervised injury prediction models are trained **only** on datasets that contain verified subject $\rightarrow$ movement/workload $\rightarrow$ injury outcome records.
- All licenses, authentication requirements, and redistribution terms are explicitly tracked.

---

## 1. Discovered Datasets Master Table

| # | Dataset Name | Publication & Authors | URL | License | Format | Subjects | Samples / Sessions | Activities | Primary Labels | Injury Labels | Biomechanics Variables | Pose / KPs | Legal Use / Redist. | Auth / Terms Required | Download Method |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **Competitive Runners Injury Dataset** | Lövdal et al. (2021), *Frontiers in Sports and Active Living* | [DataverseNL DOI: 10.34894/UWU9PV](https://doi.org/10.34894/UWU9PV) / [GitHub sonicjoy](https://github.com/sonicjoy/Injury-Prediction-for-Competitive-Runners) | Open Data / CC-BY 4.0 / MIT | CSV | 74 | 42,752 daily logs (3,320 multi-week aggregations) | Running, endurance athletics | Workload, exertion, recovery | **Yes (binary injury outcome over multi-day horizon)** | Distance, speed, Z3-Z5 intensity, exertion, recovery | Longitudinal time series | Permitted / Permitted with attribution | None | Direct HTTP automated download (`scripts/download_datasets.py`) |
| **2** | **Sports Injury Analysis Workload Dataset** | Swathikiran (2021) | [GitHub swathikiran86](https://github.com/swathikiran86/Sports-Injury-Analysis) | Open Research / MIT | CSV | Multi-athlete cohort | 1,200+ workload records, 52 injury events | Team sports, running | Game workload, mobility scores | **Yes (dated injury incidence records)** | Hip mobility, groin squeeze, game workload | Tabular physical metrics | Permitted / Permitted | None | Direct HTTP automated download (`scripts/download_datasets.py`) |
| **3** | **IntelliRehabDS (IRDS)** | Miron et al. (2021), *MDPI Data*, Brunel University London | [Zenodo DOI: 10.5281/zenodo.4610859](https://zenodo.org/records/4610859) | Creative Commons Attribution 4.0 (CC-BY-4.0) | TXT / CSV / ZIP | 29 (15 patients, 14 healthy) | 840+ exercise repetitions (198.9 MB skeleton data) | 9 physical rehab exercises (deep squat, trunk bend, shoulder reach, elbow) | Gesture type (0-8), correctness (1=correct, 2=incorrect) | Movement deviation & clinical dysfunction | Joint angles, movement duration, velocity proxy | 3D Kinect skeleton (25 joints $[x,y,z]$ per frame) | Permitted / Permitted with attribution | None | Direct Zenodo API automated download (`scripts/download_datasets.py`) |
| **4** | **Running Biomechanics Dataset (RBDS)** | Fukuchi et al. (2017), *PeerJ* | [Figshare DOI: 10.6084/m9.figshare.4543435](https://doi.org/10.6084/m9.figshare.4543435) / [BMClab](https://github.com/BMClab/datasets) | CC-BY 4.0 | CSV / HDF5 / ASCII | 28 | Multi-trial running across 3 speeds (2.5, 3.5, 4.5 m/s) | Treadmill running | Speed conditions | None (Normative biomechanics) | 3D joint angles (hip, knee, ankle in 3 planes), ground reaction forces, moments | 3D Vicon marker trajectories (calibrated joint centers) | Permitted / Permitted with attribution | None | Figshare API / GitHub automated download |
| **5** | **Walking Biomechanics Dataset (WBDS)** | Fukuchi et al. (2018), *PeerJ* | [Figshare DOI: 10.6084/m9.figshare.5722711](https://doi.org/10.6084/m9.figshare.5722711) / [BMClab](https://github.com/BMClab/datasets) | CC-BY 4.0 | CSV / HDF5 | 42 (24 young, 18 older adults) | Overground & treadmill walking trials | Walking | Age cohort, speed | None (Normative biomechanics) | Bilateral 3D joint angles, stride length, cadence, GRF | 3D marker trajectories | Permitted / Permitted with attribution | None | Figshare API automated download |
| **6** | **Balance Evaluations Dataset (BDS)** | Santos & Duarte (2016), *PeerJ* | [Figshare DOI: 10.6084/m9.figshare.3394432](https://doi.org/10.6084/m9.figshare.3394432) / [BMClab](https://github.com/BMClab/datasets) | CC-BY 4.0 | CSV | 163 | Posturography under 4 conditions (eyes open/closed, firm/foam) | Standing balance | Balance test conditions, Mini-BESTest score | Fall risk indicators | Center of pressure (COP), sway velocity, area, directional deviations | 2D/3D force plate coordinates | Permitted / Permitted with attribution | None | Direct Figshare download |
| **7** | **Kinematics & GRF of Balance (PDS)** | Santos et al. (2017), *PeerJ* | [Figshare DOI: 10.6084/m9.figshare.4525082](https://doi.org/10.6084/m9.figshare.4525082) / [BMClab](https://github.com/BMClab/datasets) | CC-BY 4.0 | CSV / TRC | 49 | Multi-trial standing perturbation & balance | Quiet standing, balance control | Stability conditions | None (Postural control) | Full-body 3D joint kinematics, center of mass, ground reaction forces | Full-body marker trajectories | Permitted / Permitted with attribution | None | Direct Figshare download |
| **8** | **GaitRec Ground Reaction Forces** | Horsak et al. (2020), *Nature Scientific Data* | [Figshare DOI: 10.6084/m9.figshare.c.4788012](https://doi.org/10.6084/m9.figshare.c.4788012) | CC-BY 4.0 | CSV / MAT | 2,295 (2,084 patients, 211 healthy) | 75,732 walking trials | Clinical overground walking | Pathology class (knee, hip, ankle, neurological) | **Yes (clinical musculoskeletal impairment classes)** | Ground reaction forces (vertical, anterior-posterior, mediolateral), bilateral symmetry | Force plate time series | Permitted / Permitted with attribution | None | Direct Figshare collection download |
| **9** | **UI-PRMD Physical Rehabilitation Dataset** | Vaculin et al. (2017), University of Idaho | [Webpages UI-PRMD](http://webpages.uidaho.edu/ui-prmd/) / [GitHub](https://github.com/tejas1904/UI-PRMD-Visualize-python-port) | Academic Research | TXT / CSV | 10 | 10 exercises $\times$ 10 subjects (correct & incorrect executions) | Squat, lunge, hurdle step, sit-to-stand, trunk flexion | Movement quality / execution accuracy | Movement anomaly / dysfunction | Joint angles, Cartesian displacement | 3D Vicon & Kinect joints | Permitted for research | None | Direct download |
| **10** | **Stanford MRNet Knee MRI** | Bien et al. (2018), *PLOS Medicine*, Stanford ML Group | [Stanford ML Group MRNet](https://stanfordmlgroup.github.io/competitions/mrnet/) | Stanford Research Use Agreement | DICOM / NPY | 1,370 exams | 1,370 sagittal, coronal, and axial knee series | Clinical MRI exams | ACL tear, Meniscal tear, Abnormal | **Yes (surgical/radiological ground truth)** | N/A (imaging) | N/A | Research use only / No redistribution | **Yes: Web registration & agreement acceptance required** | **MANUAL ACCESS REQUIRED** (See Section 3) |
| **11** | **COCO 2017 Keypoints** | Lin et al. (2014), Microsoft COCO Consortium | [COCO Dataset](https://cocodataset.org/) | CC-BY 4.0 | JSON / JPEG | N/A (general population) | 200,000+ images (150,000 person instances) | Everyday actions, sports, walking, jumping | 17 human keypoints $[x, y, v]$ | **None (Pure pose estimation benchmark)** | Keypoint 2D pixel coordinates & visibility | 17 standard COCO keypoints | Permitted / Permitted with attribution | None | Pretrained model weights download (`rtmlib` / Torchvision) |

---

## 2. Dataset Categorization vs Project Scope

| Scope Category | Primary Dataset(s) Utilized | Role in Platform |
|---|---|---|
| **A. Human Pose Estimation** | COCO 2017 Keypoints (via pretrained RTMPose-M & Keypoint R-CNN) | Video frame person detection and 17-keypoint extraction |
| **B. Sports Movement / Biomechanics** | Fukuchi RBDS / WBDS, IntelliRehabDS | Joint angles, velocity, acceleration, ROM, bilateral symmetry |
| **C. Running Biomechanics** | Lövdal et al. (2021), Fukuchi RBDS | Running volume, intensity zones, speed, kinematic adaptations |
| **D. Jumping / Landing Biomechanics** | IntelliRehabDS (deep squats, lunges), UI-PRMD | Landing valgus proxy, knee flexion damping, symmetry |
| **E. Squatting** | IntelliRehabDS, UI-PRMD | Bilateral knee valgus proxy, hip stability index, depth ROM |
| **F. Cutting / Change of Direction** | Swathikiran (groin squeeze / hip mobility), GaitRec | Asymmetry under lateral force, adductor load proxy |
| **G. ACL Injury / Knee Injury Risk** | Lövdal et al., GaitRec (knee impairment), MRNet (reference) | Knee valgus proxy, bilateral asymmetry, training spikes |
| **H. Hamstring Injury** | Lövdal et al., Swathikiran | High-speed running load, fatigue indicators, ROM deficit |
| **I. Ankle Injury** | GaitRec (ankle impairment), Fukuchi RBDS | Ankle dorsiflexion / plantarflexion ROM, asymmetry |
| **J. Shoulder Injury** | IntelliRehabDS (shoulder reach/extension) | Arm elevation ROM, bilateral shoulder asymmetry |
| **K. Lower-Back Injury** | IntelliRehabDS (trunk flexion), Swathikiran | Frontal/sagittal trunk lean deviations |
| **L. Training Load / Fatigue** | Lövdal et al. (2021), Swathikiran | Acute:Chronic workload ratio (ACWR), fatigue accumulation |
| **M. Injury History / Outcomes** | Lövdal et al. (2021), Swathikiran | Verified athlete injury occurrence records |

---

## 3. Datasets Requiring Manual Access

The following datasets require manual user registration or explicit data use agreements. The platform is architected to immediately ingest them once placed into `data/raw/`:

### Stanford MRNet Knee MRI Dataset
- **URL**: [https://stanfordmlgroup.github.io/competitions/mrnet/](https://stanfordmlgroup.github.io/competitions/mrnet/)
- **Manual Step**:
  1. Visit the Stanford ML Group MRNet competition page.
  2. Create an account and agree to the Stanford Research Data Use Agreement.
  3. Download the dataset archive (`MRNet-v1.0.tar.gz`).
  4. Place the archive or extracted files into `data/raw/mrnet/`.
- **Pipeline Ingestion**: `scripts/prepare_datasets.py` contains a dedicated parser for MRNet annotations if present in `data/raw/mrnet/`.
