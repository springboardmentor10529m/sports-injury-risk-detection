from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AthleteProfile, AthleteVideo
from .serializers import (
    AthleteProfileSerializer,
    AthleteVideoSerializer
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

    # POST - Upload a video for the logged-in athlete
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

            return Response(
                {
                    "message": "Video uploaded successfully.",
                    "video": {
                        "id": video.id,
                        "file": video.video.url,
                        "uploaded_at": video.uploaded_at
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )