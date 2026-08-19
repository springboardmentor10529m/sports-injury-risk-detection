from django.urls import path

from .views import (
    AthleteProfileView,
    AthleteVideoUploadView
)


urlpatterns = [

    path(
        "profile/",
        AthleteProfileView.as_view(),
        name="athlete-profile"
    ),

    path(
        "upload-video/",
        AthleteVideoUploadView.as_view(),
        name="upload-video"
    ),

]