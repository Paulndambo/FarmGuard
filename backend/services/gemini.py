import requests
from decouple import config
from typing import Dict, Any
import re


class GeminiError(Exception):
    def __init__(self, message, status_code=None, payload=None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload or {}


class GeminiInsightClient:
    def __init__(self):
        self.api_key = config("GEMINI_API_KEY", default="")
        self.model = config("GEMINI_MODEL", default="gemini-2.5-flash")
        self.base_url = config("GEMINI_BASE_URL").rstrip("/")

        if not self.api_key:
            raise GeminiError("GEMINI_API_KEY is missing from environment variables.")

    def _handle_response(self, response):
        try:
            payload = response.json()
        except ValueError:
            payload = {"detail": response.text}

        if 200 <= response.status_code < 300:
            return payload

        message_map = {
            400: "Bad request sent to Gemini.",
            401: "Invalid or missing Gemini API key.",
            403: "Gemini API access denied.",
            429: "Gemini rate limit exceeded.",
            500: "Gemini internal server error.",
            503: "Gemini service temporarily unavailable.",
        }

        raise GeminiError(
            message=message_map.get(response.status_code, "Unexpected Gemini API error."),
            status_code=response.status_code,
            payload=payload,
        )

    def generate_farm_insight(self, farm, weather_summary, risk_result) -> Dict[str, Any]:
        url = f"{self.base_url}/models/{self.model}:generateContent"

        prompt = self._build_prompt(farm, weather_summary, risk_result)

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                #"maxOutputTokens": 1200,
            },
        }

        response = requests.post(
            url,
            params={"key": self.api_key},
            json=payload,
            timeout=45,
        )

        data = self._handle_response(response)

        text = self._clean_response_text(self._extract_text(data))

        res: Dict[str, Any] = {
            "prompt": prompt,
            "response": text,
            "raw": data,
        }
        return res

    def _extract_text(self, data: Dict[str, Any]):
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError):
            return "Gemini returned a response, but no readable text was found."

    def _clean_response_text(self, text: str):
        lines = []

        for raw_line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
            line = raw_line.strip()

            if not line:
                lines.append("")
                continue

            if re.match(r"^here (is|are)\b", line, flags=re.IGNORECASE):
                continue

            line = re.sub(r"^\s*#{1,6}\s*", "", line)
            line = line.replace("**", "").replace("__", "")
            line = re.sub(r"^(jambo|hello|hi|dear farmer)[,!.\s]+", "", line, flags=re.IGNORECASE)
            line = re.sub(r"^\s*[-*]\s+", "- ", line)
            line = re.sub(r"^\s*(\d+)\)\s+", r"\1. ", line)
            lines.append(line)

        cleaned = "\n".join(lines)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

        return cleaned or "No readable advisory was returned."

    def _build_prompt(self, farm, weather_summary, risk_result):
        return f"""
            You are an agricultural weather-risk assistant.

            Analyze the following farm and weather-risk data and produce a practical advisory for a farmer or field officer.

            Farm:
            - Name: {farm.name}
            - County: {farm.county}
            - Crop type: {farm.crop_type}
            - Land size: {farm.land_acres} acres
            - Notes: {farm.notes or "None"}

            Weather Summary:
            {weather_summary}

            Crop Growth Conditions:
            {risk_result.get("crop_conditions")}

            Crop Fit Analysis:
            {risk_result.get("crop_fit")}

            Risk Assessment:
            - Score: {risk_result["score"]}
            - Level: {risk_result["level"]}
            - Drivers: {risk_result["drivers"]}
            - Recommended actions: {risk_result["recommended_actions"]}

            Important writing rules:
            Use the crop growth conditions and crop fit analysis as the main reference.
            Do not contradict the risk score, risk level, drivers, or recommended actions.
            Do not begin with a greeting such as Jambo, Hello, or Dear farmer.
            Do not include an introduction such as "Here is your advisory".
            Do not use Markdown formatting, asterisks, bold text, headings with #, or code blocks.
            Mention the farm by name in the Situation Summary.

            Return only the advisory text in this exact plain-text format.
            Complete every section:

            1. Situation Summary
            Write 2-3 complete sentences.

            2. Crop-Specific Weather Fit
            Write 2-3 complete sentences focused on the crop.

            3. Key Risks
            - Write 2-4 bullet points.

            4. Recommended Actions
            - Write 2-4 bullet points.

            5. SMS Alert Version
            Write one short SMS-style alert under 320 characters.

            Keep the language clear, practical, and suitable for a farmer in Kenya.
        """
