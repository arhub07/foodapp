from fastapi import APIRouter
from pinecone import Pinecone
from app.config import get_settings

router = APIRouter()
settings = get_settings()

@router.get("/restaurants")
async def get_restaurants():
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index("food-rescue-menus")
    
    results = index.query(
        vector=[0.0] * 1536,
        top_k=1000,
        include_metadata=True
    )
    
    restaurants = []
    for match in results.matches:
        md = match.metadata
        restaurants.append({
            "id": match.id,
            "name": md.get("restaurant_name", ""),
            "address": md.get("address", ""),
            "lat": md.get("lat", 0),
            "lng": md.get("lng", 0),
            "rating": md.get("rating", 0),
            "closing_time": md.get("closing_time", "Unknown"),
            "hours_of_operation": md.get("hours_of_operation", []),
        })
    
    return {"restaurants": restaurants, "total": len(restaurants)}