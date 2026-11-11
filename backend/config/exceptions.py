from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Wrap DRF responses in a consistent envelope
        return Response(
            {
                "error": True,
                "status_code": response.status_code,
                "detail": response.data,
            },
            status=response.status_code,
        )

    # Non-DRF exceptions — let Django handle them normally in DEBUG mode
    # so the 500 propagates correctly rather than being swallowed
    return None
