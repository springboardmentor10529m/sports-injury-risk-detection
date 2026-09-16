from rest_framework import serializers

from .models import AthleteProfile, AthleteVideo, Notification


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
            "injury_type",
            "recovery_status",
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

    def validate(self, attrs):
        previous_injury = attrs.get("previous_injury")
        injury_type = attrs.get("injury_type")
        recovery_status = attrs.get("recovery_status")

        if previous_injury == "yes":

            if not injury_type:
                raise serializers.ValidationError({
                    "injury_type": "Please select your previous injury type."
                })

            if not recovery_status:
                raise serializers.ValidationError({
                    "recovery_status": "Please select your recovery status."
                })

        else:
            attrs["injury_type"] = ""
            attrs["recovery_status"] = ""

        return attrs


class AthleteVideoSerializer(serializers.ModelSerializer):

    class Meta:
        model = AthleteVideo
        fields = [
             "id",
            "video",
            "uploaded_at",
            "risk_level",
            "risk_score",
            "risk_factors",
            "risk_breakdown",
            "movement_anomaly_score",
            "recommendations",
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

class NotificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "is_read",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]    