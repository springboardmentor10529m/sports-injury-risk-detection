from django.contrib.auth.models import User
from django.db import models


class AthleteProfile(models.Model):

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    INJURY_CHOICES = [
        ("yes", "Yes"),
        ("no", "No"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="athlete_profile"
    )

    full_name = models.CharField(
        max_length=150
    )

    age = models.PositiveIntegerField()

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES
    )

    sport = models.CharField(
        max_length=100
    )

    height = models.DecimalField(
        max_digits=5,
        decimal_places=2
    )

    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2
    )

    position = models.CharField(
        max_length=100,
        blank=True
    )

    training_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    previous_injury = models.CharField(
        max_length=3,
        choices=INJURY_CHOICES
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.full_name} - {self.sport}"


class AthleteVideo(models.Model):

    athlete = models.ForeignKey(
        AthleteProfile,
        on_delete=models.CASCADE,
        related_name="videos"
    )

    video = models.FileField(
        upload_to="athlete_videos/"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.athlete.full_name} - {self.video.name}"        