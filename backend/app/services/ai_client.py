"""AI client for incident classification.

This module is intentionally defensive:
- If Anthropic is not installed, it falls back safely.
- If API key is missing/invalid, it falls back safely.
- If API request fails, it falls back safely.

The API never raises to callers in normal operation.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "400"))

CATEGORIES = {
    "fire",
    "gunshot",
    "flood",
    "kidnapping",
    "earthquake",
    "landslide",
    "accident",
    "civil unrest",
    "medical emergency",
    "other",
}


class AIClient:
    """Service client used by the backend to classify incidents."""

    def __init__(self) -> None:
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self._anthropic_module = None
        self._client = None

        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY not set; AI classification will use fallback mode.")
            return

        try:
            import anthropic  # type: ignore

            self._anthropic_module = anthropic
            self._client = anthropic.Anthropic(api_key=self.api_key)
            logger.info("AI client initialized.")
        except Exception as exc:
            logger.warning("Anthropic SDK unavailable or init failed. Fallback mode enabled: %s", exc)
            self._anthropic_module = None
            self._client = None

    def classify_incident(
        self,
        description: str,
        media_url: str | None = None,
        transcript: str | None = None,
        type_evenement: str | None = None,
        localisation: str | None = None,
        existing_reports: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Classify one incident and always return a safe dict result."""
        if not description and not media_url and not transcript:
            return self._fallback_response("empty_description")

        if self._client is None or self._anthropic_module is None:
            return self._fallback_response("client_unavailable")

        full_desc = description.strip() if description else ""
        if transcript:
            full_desc += f"\n\n[Transcript vocal / Témoignage]: {transcript.strip()}"

        prompt_text = self._build_prompt(
            description=full_desc,
            type_evenement=type_evenement,
            localisation=localisation,
            existing_reports=existing_reports,
        )

        messages_content: list[dict[str, Any]] = [{"type": "text", "text": prompt_text}]

        if media_url:
            from app.services.image_utils import encode_image_base64, extract_video_frames
            filepath = media_url.lstrip("/")
            if os.path.exists(filepath):
                ext = filepath.lower().split('.')[-1]
                if ext in ["jpg", "jpeg", "png", "webp"]:
                    b64 = encode_image_base64(filepath)
                    if b64:
                        mime = f"image/{ext if ext != 'jpg' else 'jpeg'}"
                        messages_content.append({
                            "type": "image",
                            "source": {"type": "base64", "media_type": mime, "data": b64}
                        })
                elif ext in ["mp4", "webm"]:
                    frames = extract_video_frames(filepath, max_frames=3)
                    for frame_b64 in frames:
                        messages_content.append({
                            "type": "image",
                            "source": {"type": "base64", "media_type": "image/jpeg", "data": frame_b64}
                        })

        try:
            response = self._client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=self._system_prompt(),
                messages=[{"role": "user", "content": messages_content}],
            )
            raw_text = response.content[0].text.strip()
            return self._parse_response(raw_text)
        except Exception as exc:
            logger.warning("AI classification failed, returning fallback: %s", exc)
            return self._fallback_response("api_error")

    def _system_prompt(self) -> str:
        return (
            "You are an incident triage model for a civic safety platform in Haiti. "
            "Return strict JSON only. No markdown, no extra text."
        )

    def _build_prompt(
        self,
        description: str,
        type_evenement: str | None,
        localisation: str | None,
        existing_reports: list[dict[str, Any]] | None,
    ) -> str:
        reports_section = ""
        if existing_reports:
            lines = []
            for report in existing_reports[:5]:
                snippet = str(report.get("description", ""))[:120]
                lines.append(f"- {snippet}")
            reports_section = "\nRecent nearby reports:\n" + "\n".join(lines)

        categories_csv = ", ".join(sorted(CATEGORIES))

        return f"""
Classify this incident report.

Description: {description}
Declared type: {type_evenement or "not provided"}
Location: {localisation or "not provided"}
{reports_section}

Allowed categories: {categories_csv}
Urgency scale: 1 (low) to 5 (critical)

Return strict JSON with this exact shape:
{{
  "category": "one_allowed_category",
  "urgency": 1,
  "summary": "one sentence",
  "is_duplicate": false,
  "confidence": 0.5,
  "recommended_action": "short action"
}}
"""

    def _parse_response(self, raw_text: str) -> dict[str, Any]:
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.strip("`")
            if clean.lower().startswith("json"):
                clean = clean[4:].strip()

        data = json.loads(clean)

        category = str(data.get("category", "other"))
        if category not in CATEGORIES:
            category = "other"

        try:
            urgency = int(data.get("urgency", 1))
        except (TypeError, ValueError):
            urgency = 1

        try:
            confidence = float(data.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0

        return {
            "category": category,
            "urgency": max(1, min(5, urgency)),
            "summary": str(data.get("summary", "Incident received.")),
            "is_duplicate": bool(data.get("is_duplicate", False)),
            "confidence": max(0.0, min(1.0, round(confidence, 2))),
            "recommended_action": str(data.get("recommended_action", "Manual review required.")),
        }

    def _fallback_response(self, error_type: str) -> dict[str, Any]:
        return {
            "category": "other",
            "urgency": 1,
            "summary": "Signalement recu - analyse IA temporairement indisponible.",
            "is_duplicate": False,
            "confidence": 0.0,
            "recommended_action": "Verification manuelle requise.",
            "error": error_type,
        }


# Singleton client matching your teammate's expected usage:
# from ai_client import ai_client
# result = ai_client.classify_incident(description="...", localisation="Petion-Ville")
ai_client = AIClient()


async def classify_text(description: str, media_url: str | None = None, transcript: str | None = None) -> dict[str, Any]:
    """Backward-compatible async adapter used by incidents router."""
    return ai_client.classify_incident(description=description, media_url=media_url, transcript=transcript)
