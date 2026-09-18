import json
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
headers = {
    "Authorization": "Bearer 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",
    "Accept": "text/event-stream",
}

payload = {
    "model": "moonshotai/kimi-k3",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Analyze biomechanical movement risk: "
                        "Left knee angle 165 deg, Right knee angle 73 deg. Cadence 160. "
                        "Return ONLY JSON: {\"riskScore\": 45, \"riskLevel\": \"Moderate\", \"reasoning\": \"brief note\"}"
                    ),
                }
            ],
        }
    ],
    "max_tokens": 2048,
    "temperature": 0.3,
    "stream": True,
}

print("Sending request...")
response = requests.post(invoke_url, headers=headers, json=payload, stream=True, verify=False, timeout=60)
print("Response status:", response.status_code)

full_content = []
for line in response.iter_lines():
    if line:
        decoded = line.decode("utf-8")
        if decoded.startswith("data: ") and not decoded.startswith("data: [DONE]"):
            chunk_json = decoded[6:]
            try:
                data = json.loads(chunk_json)
                delta = data["choices"][0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    print(content, end="", flush=True)
                    full_content.append(content)
            except Exception:
                pass

print("\n\nDone! Total chars:", len("".join(full_content)))
