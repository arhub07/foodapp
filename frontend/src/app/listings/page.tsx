"use client";

import { Package, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const SAMPLE_LISTINGS = [
  { id: "1", title: "Fresh Bread Assortment", restaurant: "Artisan Bakery", category: "Baked Goods", quantity: "12 loaves", expiresIn: "3 hours", distance: "0.5 mi" },
  { id: "2", title: "Mixed Salad Greens", restaurant: "Green Bistro", category: "Produce", quantity: "8 containers", expiresIn: "5 hours", distance: "1.2 mi" },
  { id: "3", title: "Pasta Bolognese", restaurant: "Trattoria Roma", category: "Prepared Meals", quantity: "6 servings", expiresIn: "2 hours", distance: "0.8 mi" },
];

export default function ListingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
          <p className="mt-1 text-sm text-gray-500">Available surplus food near you</p>
        </div>
        <Link href="/map">
          <Button size="sm" className="gap-1.5">
            <MapPin className="h-4 w-4" /> Map View
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_LISTINGS.map((listing) => (
          <div key={listing.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500">{listing.restaurant}</p>
              </div>
              <Badge variant="success">{listing.category}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{listing.quantity}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{listing.expiresIn}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{listing.distance}</span>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">Claim</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
