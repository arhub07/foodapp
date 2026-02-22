"""Search Pinecone for restaurants near the user's location.

Takes an address (or lat/lng), geocodes it, then queries Pinecone
for restaurants within a given radius. Each Pinecone vector represents
one restaurant with name, closing hours, and coordinates.
"""

import os
from math import radians, cos, sin, asin, sqrt
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pinecone import Pinecone
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter()
settings = get_settings()

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
INDEX_NAME = "food-rescue-menus"


class SearchRequest(BaseModel):
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    query: str = "restaurant"
    radius_miles: float = 5.0


def _geocode(address: str) -> tuple[float, float, str]:
    params = {"address": address, "key": settings.GOOGLE_MAPS_API_KEY}
    with httpx.Client(timeout=15) as client:
        resp = client.get(GEOCODE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(400, f"Could not geocode: {address}")
    result = data["results"][0]
    loc = result["geometry"]["location"]
    return loc["lat"], loc["lng"], result.get("formatted_address", address)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 3956 * 2 * asin(sqrt(a))


@router.post("/search")
async def search_nearby(req: SearchRequest):
    if req.address:
        user_lat, user_lng, formatted = _geocode(req.address)
    elif req.lat is not None and req.lng is not None:
        user_lat, user_lng = req.lat, req.lng
        formatted = f"{user_lat:.4f}, {user_lng:.4f}"
    else:
        raise HTTPException(400, "Provide either an address or lat/lng.")

    pinecone_key = settings.PINECONE_API_KEY or os.getenv("PINECONE_API_KEY", "")
    if not pinecone_key or not settings.OPENROUTER_API_KEY:
        raise HTTPException(500, "Pinecone or OpenRouter API key not configured.")

    oai = OpenAI(api_key=settings.OPENROUTER_API_KEY, base_url=settings.OPENROUTER_BASE_URL)
    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(INDEX_NAME)

    radius_km = req.radius_miles * 1.60934
    delta = radius_km / 111.0

    embedding = oai.embeddings.create(
        input=[req.query], model="openai/text-embedding-3-small"
    )
    query_vec = embedding.data[0].embedding

    results = index.query(
        vector=query_vec,
        top_k=200,
        filter={
            "$and": [
                {"lat": {"$gte": user_lat - delta}},
                {"lat": {"$lte": user_lat + delta}},
                {"lng": {"$gte": user_lng - delta}},
                {"lng": {"$lte": user_lng + delta}},
            ]
        },
        include_metadata=True,
    )

    restaurants: list[dict[str, Any]] = []

    for match in results.matches:
        md = match.metadata
        rlat = float(md.get("lat", 0))
        rlng = float(md.get("lng", 0))
        dist = _haversine(user_lat, user_lng, rlat, rlng)

        if dist > req.radius_miles:
            continue

        restaurants.append({
            "restaurant_name": md.get("restaurant_name", "Unknown"),
            "address": md.get("address", ""),
            "lat": rlat,
            "lng": rlng,
            "rating": float(md.get("rating", 0)),
            "closing_time": md.get("closing_time", "Unknown"),
            "hours_of_operation": md.get("hours_of_operation", []),
            "distance_miles": round(dist, 2),
            "score": match.score,
        })

    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for r in restaurants:
        name = r["restaurant_name"]
        if name not in seen:
            seen.add(name)
            unique.append(r)

    unique.sort(key=lambda r: r["distance_miles"])

    return {
        "user_location": {
            "lat": user_lat,
            "lng": user_lng,
            "formatted_address": formatted,
        },
        "radius_miles": req.radius_miles,
        "restaurants": unique,
        "total_restaurants": len(unique),
    }
