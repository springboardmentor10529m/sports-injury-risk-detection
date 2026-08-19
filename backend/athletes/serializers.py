from rest_framework import serializers

from .models import AthleteProfile, AthleteVideo


class AthleteProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = AthleteProfile

        fields = [
            "full_name",
            "age",
            "gender",
            "sport",
            "height",
            "weight",
            "position",
            "training_hours",
            "previous_injury",
        ]

    def validate_age(self, value):

        if value < 1 or value > 100:
            raise serializers.ValidationError(
                "Age must be between 1 and 100."
            )

        return value

    def validate_height(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Height must be greater than 0."
            )

        return value

    def validate_weight(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Weight must be greater than 0."
            )

        return value

    def validate_training_hours(self, value):

        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Training hours cannot be negative."
            )

        return value


class AthleteVideoSerializer(serializers.ModelSerializer):

    class Meta:
        model = AthleteVideo
        fields = [
            "id",
            "video",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_at",
        ]

    def validate_video(self, value):

        # Maximum file size: 100 MB
        max_size = 100 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Video file must be smaller than 100 MB."
            )

        allowed_types = [
            "video/mp4",
            "video/quicktime",
            "video/x-msvideo",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only MP4, MOV, and AVI videos are allowed."
            )

        return value        