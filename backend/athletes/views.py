from django.conf import settings

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AthleteProfile, AthleteVideo, Notification
from .serializers import (
    AthleteProfileSerializer,
    AthleteVideoSerializer,
    NotificationSerializer,
)


class AthleteProfileView(APIView):

    permission_classes = [IsAuthenticated]

    # GET - Retrieve the logged-in user's athlete profile
    def get(self, request):

        try:

            profile = AthleteProfile.objects.get(
                user=request.user
            )

            serializer = AthleteProfileSerializer(
                profile
            )

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        except AthleteProfile.DoesNotExist:

            return Response(
                {
                    "error": "Athlete profile not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )


    # POST - Create or update the logged-in user's athlete profile
    def post(self, request):

        try:

            profile = AthleteProfile.objects.get(
                user=request.user
            )

            serializer = AthleteProfileSerializer(
                profile,
                data=request.data
            )

        except AthleteProfile.DoesNotExist:

            serializer = AthleteProfileSerializer(
                data=request.data
            )

        if serializer.is_valid():

            profile = serializer.save(
                user=request.user
            )

            return Response(
                {
                    "message": "Athlete details saved successfully.",
                    "athlete": AthleteProfileSerializer(
                        profile
                    ).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class AthleteVideoUploadView(APIView):

    permission_classes = [IsAuthenticated]

    # POST - Upload and process a video
    def post(self, request):

        try:

            athlete = AthleteProfile.objects.get(
                user=request.user
            )

        except AthleteProfile.DoesNotExist:

            return Response(
                {
                    "error": "Please complete your athlete details first."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AthleteVideoSerializer(
            data=request.data
        )

        if serializer.is_valid():

            video = serializer.save(
                athlete=athlete
            )

            # Process the uploaded video
            from .video_processing import process_video

            processing_result = process_video(
                video.video.path,
                video.id, 
                athlete_profile=athlete

            )

            # Save the risk assessment to the database
            risk_assessment = processing_result.get(
                "risk_assessment"
            )

            recommendations = {}

            if risk_assessment:
                recommendations = risk_assessment.get(
                    "recommendations",
                    {}
                )

            if risk_assessment:

                video.risk_level = risk_assessment.get("risk_level")
                video.risk_score = risk_assessment.get("risk_score")
                video.risk_factors = risk_assessment.get("risk_factors", [])

                risk_breakdown = risk_assessment.get("risk_breakdown", {})

                risk_breakdown["movement_quality_score"] = (
                    risk_assessment.get("movement_quality_score")
                )

                risk_breakdown["biomechanical_efficiency_score"] = (
                    risk_assessment.get("biomechanical_efficiency_score")
                )
                risk_breakdown["early_movement_quality_score"] = (
                    risk_assessment.get(
                        "early_movement_quality_score"
                    )
                )

                risk_breakdown["late_movement_quality_score"] = (
                    risk_assessment.get(
                        "late_movement_quality_score"
                    )
                )
                video.risk_breakdown = risk_breakdown
                video.movement_anomaly_score = risk_assessment.get(
                    "movement_anomaly_score" 
                )

                video.recommendations = recommendations

                video.save(
                    update_fields=[
                        "risk_level",
                        "risk_score",
                        "risk_factors",
                        "risk_breakdown",
                        "movement_anomaly_score",
                        "recommendations",
                    ]
                )
                
            # Create injury-risk notification for medium/high risk
            if video.risk_level in ["Medium", "High"]:

                Notification.objects.create(
                    athlete=athlete,
                    notification_type="injury_risk",
                    title=f"Injury Risk Alert: {video.risk_level}",
                    message=(
                        f"Your latest sports video assessment detected "
                        f"{video.risk_level.lower()} injury risk "
                        f"with a risk score of {video.risk_score}/100. "
                        f"Review the movement analysis and corrective recommendations."
                    ),
                )   

            
            if not processing_result["success"]:

                return Response(
                    {
                        "message": "Video uploaded, but processing failed.",
                        "processing": processing_result
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response(
                {
                    "message": "Video uploaded and processed successfully.",
                    "video": {
                        "id": video.id,
                        "file": video.video.url,
                        "uploaded_at": video.uploaded_at
                    },
                    "processing": processing_result
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class AthleteVideoDeleteView(APIView):

    permission_classes = [IsAuthenticated]

    # DELETE - Delete a video belonging to the logged-in athlete
    def delete(self, request, video_id):

        try:

            athlete = AthleteProfile.objects.get(
                user=request.user
            )

        except AthleteProfile.DoesNotExist:

            return Response(
                {
                    "error": "Athlete profile not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:

            video = AthleteVideo.objects.get(
                id=video_id,
                athlete=athlete
            )

        except AthleteVideo.DoesNotExist:

            return Response(
                {
                    "error": "Video not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete uploaded video file
        if video.video:

            video.video.delete(
                save=False
            )

        # Import file handling modules
        import os
        import shutil

        # Delete processed frames
        processed_frames_directory = os.path.join(
            settings.MEDIA_ROOT,
            "processed_frames",
            str(video.id)
        )

        if os.path.exists(
            processed_frames_directory
        ):

            shutil.rmtree(
                processed_frames_directory
            )

        # Delete pose results
        pose_results_directory = os.path.join(
            settings.MEDIA_ROOT,
            "pose_results",
            str(video.id)
        )

        if os.path.exists(
            pose_results_directory
        ):

            shutil.rmtree(
                pose_results_directory
            )

        # Delete database record
        video.delete()

        return Response(
            {
                "message": "Video deleted successfully."
            },
            status=status.HTTP_200_OK
        )

class AthleteVideoListView(APIView):

    permission_classes = [IsAuthenticated]

    # GET - List videos belonging to the logged-in athlete
    def get(self, request):

        try:
            athlete = AthleteProfile.objects.get(
                user=request.user
            )

        except AthleteProfile.DoesNotExist:

            return Response(
                {
                    "error": "Athlete profile not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        videos = AthleteVideo.objects.filter(
            athlete=athlete
        ).order_by("-uploaded_at")

        serializer = AthleteVideoSerializer(
            videos,
            many=True,
            context={"request": request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )    

class NotificationListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:
            athlete = AthleteProfile.objects.get(
                user=request.user
            )

        except AthleteProfile.DoesNotExist:
            return Response(
                {"error": "Athlete profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        notifications = Notification.objects.filter(
            athlete=athlete
        ).order_by("-created_at")

        serializer = NotificationSerializer(
            notifications,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )    