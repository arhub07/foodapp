"use client";
import { useEffect, useState } from "react";
import { MapPin, Clock, UtensilsCrossed, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  closing_time: string;
}

const CARD_COLORS = [
  "from-brand-700 to-brand-700",
];

function isRestaurantClosed(closing_time: string): boolean {
  if (!closing_time || closing_time === "Unknown") return false;
  const now = new Date();
  const closing = new Date();
  const [time, modifier] = closing_time.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  closing.setHours(hours, minutes, 0, 0);
  return now > closing;
}

export default function ListingsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.restaurants);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
              <Sparkles className="h-3 w-3" />
              {restaurants.length} restaurants available
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900">Browse Listings</h1>
            <p className="mt-1 text-gray-500 text-lg">Fresh surplus food available near you</p>
          </div>
          <Link href="/map">
            <Button size="sm" className="gap-1.5 shadow-md">
              <MapPin className="h-4 w-4" /> Map View
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-gray-500">Loading restaurants...</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r, idx) => {
              const closed = isRestaurantClosed(r.closing_time);
              return (
                <div
                  key={r.id}
                  className="group flex flex-col justify-between rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  <div className={`bg-gradient-to-r ${CARD_COLORS[idx % CARD_COLORS.length]} p-5`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <UtensilsCrossed className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">
                        {r.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <p className="text-sm text-gray-500 flex items-start gap-1.5">
                      <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {r.address}
                    </p>

                    {closed ? (
                      <div className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-2.5">
                        <Clock className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">Closed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2.5">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">Closes at {r.closing_time}</span>
                      </div>
                    )}

                    <Button
                      className="w-full mt-auto bg-gray-900 hover:bg-gray-700 text-white rounded-xl py-2.5 font-semibold transition-all duration-200 group-hover:bg-emerald-600"
                      onClick={() => router.push(`/map?lat=${r.lat}&lng=${r.lng}&name=${encodeURIComponent(r.name)}`)}
                    >
                      Directions
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}