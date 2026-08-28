import { useParams } from "react-router-dom";
import { getCoachAthletePoseFrames, getCoachAthleteProfile, getCoachAthleteVideos } from "../api/client";
import StaffAthleteDetail from "../components/StaffAthleteDetail";

export default function CoachAthleteDetail() {
  const { id } = useParams();
  return (
    <StaffAthleteDetail
      athleteId={id}
      fetchProfile={getCoachAthleteProfile}
      fetchVideos={getCoachAthleteVideos}
      fetchPoseFrames={getCoachAthletePoseFrames}
      backTo="/coach/team"
      backLabel="Back to team"
    />
  );
}
