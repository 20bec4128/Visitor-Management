# Face Service (Local)

Stateless face-encoding service used by the Spring Boot backend.

## Run

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Health: `GET /health`  
Encode: `POST /embed` (or `/encode`) with JSON `{ "imageBase64": "data:image/jpeg;base64,..." }`
