"""Custom domain and API exceptions for clear error handling."""

from fastapi import HTTPException, status


class DomainException(Exception):
    """Base domain error."""
    pass


class ResourceNotFoundError(DomainException):
    def __init__(self, resource_type: str, identifier: str):
        self.message = f"{resource_type} '{identifier}' not found."
        super().__init__(self.message)


class DuplicateResourceError(DomainException):
    def __init__(self, resource_type: str, identifier: str):
        self.message = f"{resource_type} '{identifier}' already exists."
        super().__init__(self.message)


class ProviderAPIError(DomainException):
    def __init__(self, provider: str, detail: str):
        self.message = f"Provider '{provider}' error: {detail}"
        super().__init__(self.message)


def to_http_exception(exc: DomainException) -> HTTPException:
    """Map domain exceptions to FastAPI HTTPException."""
    if isinstance(exc, ResourceNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message)
    elif isinstance(exc, DuplicateResourceError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    elif isinstance(exc, ProviderAPIError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
