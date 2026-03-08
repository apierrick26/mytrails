from fastapi import APIRouter, UploadFile, File, HTTPException
from services.gpx_parser import parse_gpx

router = APIRouter(prefix="/gpx", tags=["gpx"])


@router.post("/parse")
async def parse_gpx_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".gpx"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format .gpx")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 20 MB)")

    result = parse_gpx(content)

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return result
