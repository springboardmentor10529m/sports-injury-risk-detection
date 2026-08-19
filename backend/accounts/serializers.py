from django.contrib.auth.models import User
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):

    full_name = serializers.CharField(
        write_only=True,
        max_length=150
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    confirm_password = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
            "password",
            "confirm_password"
        ]

    def validate_email(self, value):
        email = value.lower().strip()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, data):

        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data

    def create(self, validated_data):

        full_name = validated_data.pop("full_name")
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=password
        )

        user.first_name = full_name
        user.save()

        return user


class LoginSerializer(serializers.Serializer):

    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True
    )

    def validate(self, data):

        email = data.get("email")
        password = data.get("password")

        try:
            user = User.objects.get(email=email)

        except User.DoesNotExist:

            raise serializers.ValidationError(
                "No account exists with this email."
            )

        if not user.check_password(password):

            raise serializers.ValidationError(
                "Incorrect password."
            )

        if not user.is_active:

            raise serializers.ValidationError(
                "This account is inactive."
            )

        data["user"] = user

        return data        