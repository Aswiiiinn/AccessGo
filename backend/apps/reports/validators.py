import os
from django.core.exceptions import ValidationError


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_report_image(image_file):
    ext = os.path.splitext(image_file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content_type = getattr(image_file, "content_type", None)
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            f"Unsupported MIME type '{content_type}'. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    if image_file.size > MAX_SIZE_BYTES:
        raise ValidationError(
            f"Image too large ({image_file.size // 1024} KB). Maximum allowed size is 5 MB."
        )
