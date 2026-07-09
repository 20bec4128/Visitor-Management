import base64
import os
import re
import logging

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from insightface.app import FaceAnalysis

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Visitor Face Service", version="2.0.0")

# InsightFace with buffalo_l model (512-dim ArcFace embeddings)
_face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
_face_app.prepare(ctx_id=0, det_size=(640, 640))

_DATA_URL_RE = re.compile(r"^data:image/[^;]+;base64,", re.IGNORECASE)


class EmbedRequest(BaseModel):
    imageBase64: str


class EmbedResponse(BaseModel):
    embedding: list[float]


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    if not request.imageBase64:
        raise HTTPException(status_code=400, detail="imageBase64 is required")

    try:
        raw = _DATA_URL_RE.sub("", request.imageBase64.strip())
        image_bytes = base64.b64decode(raw)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as ex:
        logger.error(f"Failed to decode image: {ex}")
        raise HTTPException(status_code=400, detail="Invalid image data") from ex

    if img is None:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    faces = _face_app.get(img)
    if not faces:
        logger.info("No face detected in image")
        return EmbedResponse(embedding=[])

    # Use the largest detected face
    faces.sort(
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        reverse=True,
    )
    embedding = faces[0].embedding.tolist()
    logger.info(f"Face detected, embedding size: {len(embedding)}")
    return EmbedResponse(embedding=embedding)


# Backward-compatible alias (older docs/clients may call this)
@app.post("/encode", response_model=EmbedResponse)
def encode(request: EmbedRequest):
    return embed(request)
