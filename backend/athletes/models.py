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

    INJURY_TYPE_CHOICES = [
        ("acl_tear", "ACL Tear"),
        ("mcl_injury", "MCL Injury"),
        ("meniscus_injury", "Meniscus Injury"),
        ("hamstring_strain", "Hamstring Strain"),
        ("quadriceps_strain", "Quadriceps Strain"),
        ("ankle_sprain", "Ankle Sprain"),
        ("achilles_injury", "Achilles Tendon Injury"),
        ("shoulder_injury", "Shoulder Injury"),
        ("lower_back_injury", "Lower Back Injury"),
        ("other", "Other"),
    ]

    RECOVERY_STATUS_CHOICES = [
        ("fully_recovered", "Fully Recovered"),
        ("partially_recovered", "Partially Recovered"),
        ("currently_injured", "Currently Injured"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="athlete_profile"
    )

    full_name = models.CharField(max_length=150)
    age = models.PositiveIntegerField()
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES
    )
    sport = models.CharField(max_length=100)
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

    injury_type = models.CharField(
        max_length=30,
        choices=INJURY_TYPE_CHOICES,
        blank=True
    )

    recovery_status = models.CharField(
        max_length=30,
        choices=RECOVERY_STATUS_CHOICES,
        blank=True
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

    risk_level = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    risk_score = models.IntegerField(
        blank=True,
        null=True
    )

    risk_factors = models.JSONField(
        blank=True,
        null=True
    )

    risk_breakdown = models.JSONField(
        blank=True,
        null=True
    )

    movement_anomaly_score = models.IntegerField(
        blank=True,
        null=True
    )

    recommendations = models.JSONField(
        blank=True,
        null=True
    )
    def __str__(self):
        return f"{self.athlete.full_name} - {self.video.name}"

class Notification(models.Model):

    NOTIFICATION_TYPES = [
        ("injury_risk", "Injury Risk"),
        ("movement_alert", "High-Risk Movement"),
        ("training_load", "Training Load Warning"),
        ("recovery", "Recovery Reminder"),
        ("assessment", "Assessment Completion"),
    ]

    athlete = models.ForeignKey(
        AthleteProfile,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES
    )

    title = models.CharField(
        max_length=200
    )

    message = models.TextField()

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.athlete.full_name} - {self.title}"    