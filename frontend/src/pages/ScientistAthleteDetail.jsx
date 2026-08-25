import { useParams } from "react-router-dom";
import { getScientistAthleteProfile, getScientistAthleteVideos } from "../api/client";
import StaffAthleteDetail from "../components/StaffAthleteDetail";

export default function ScientistAthleteDetail() {
  const { id } = useParams();
  return (
    <StaffAthleteDetail
      athleteId={id}
      fetchProfile={getScientistAthleteProfile}
      fetchVideos={getScientistAthleteVideos}
      backTo="/scientist/athletes"
      backLabel="Back to dataset"
    />
  );
}
