from django.urls import path

from .views import (
    AthleteProfileView,
    AthleteVideoUploadView,
    AthleteVideoDeleteView,
    AthleteVideoListView,
    NotificationListView,
    AthleteVideoExcelExportView
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
    
    path(
    "videos/",
    AthleteVideoListView.as_view(),
    name="video-list"
    ),

    path(
    "videos/<int:video_id>/export-excel/",
    AthleteVideoExcelExportView.as_view(),
    name="video-export-excel"
    ),
    
    path(
        "videos/<int:video_id>/",
        AthleteVideoDeleteView.as_view(),
        name="delete-video"
    ),

    path(
        "notifications/",
        NotificationListView.as_view(),
        name="athlete-notifications",
),

]