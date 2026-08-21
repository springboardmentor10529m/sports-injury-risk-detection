"""Custom exceptions for SafeMove API."""

from fastapi import HTTPException, status


class SafeMoveException(HTTPException):
    """Base exception for SafeMove."""

    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(SafeMoveException):
    """Resource not found."""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ForbiddenError(SafeMoveException):
    """Access forbidden."""

    def __init__(self, detail: str = "Access forbidden"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class ValidationError(SafeMoveException):
    """Validation error (e.g. duplicate email)."""

    def __init__(self, detail: str = "Validation error"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class ProcessingError(SafeMoveException):
    """Error during video/ML processing."""

    def __init__(self, detail: str = "Processing error"):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
