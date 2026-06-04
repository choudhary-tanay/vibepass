"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; componentRestrictions?: { country: string | string[] } }
          ) => {
            addListener: (event: string, fn: () => void) => void;
            getPlace: () => { formatted_address?: string; name?: string };
          };
        };
      };
    };
    __gMapsLoaded?: boolean;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(callback: () => void) {
  if (window.__gMapsLoaded) {
    callback();
    return;
  }
  if (document.getElementById("google-maps-script")) {
    const check = setInterval(() => {
      if (window.__gMapsLoaded) {
        clearInterval(check);
        callback();
      }
    }, 100);
    return;
  }
  const script = document.createElement("script");
  script.id = "google-maps-script";
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    window.__gMapsLoaded = true;
    callback();
  };
  document.head.appendChild(script);
}

export function LocationInput({ value, onChange, placeholder, className, id }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocompleteReady, setAutocompleteReady] = useState(false);

  // Sync parent value → input DOM when value changes externally
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return;

    loadGoogleMaps(() => {
      if (!inputRef.current || !window.google?.maps?.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode", "establishment"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const address = place.formatted_address ?? place.name ?? "";
        if (address) {
          if (inputRef.current) inputRef.current.value = address;
          onChange(address);
        }
      });

      setAutocompleteReady(true);
    });
  }, [onChange]);

  // If no API key — plain controlled input
  if (!API_KEY) {
    return (
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "e.g. Koramangala, Bangalore"}
        className={
          className ??
          "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        }
      />
    );
  }

  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search for an address..."}
        className={
          className ??
          "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        }
      />
      {!autocompleteReady && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          Loading maps...
        </span>
      )}
    </div>
  );
}
