"use client";

import { useEffect, useState } from "react";

type GeoResponse = {
  country_code?: string;
  country?: string;
};

export function IpGate() {
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("https://api.ip.sb/geoip/");
        const data: GeoResponse = await res.json();
        if (data.country_code === "CN") {
          setBlocked(true);
        }
      } catch (err) {
        console.warn("IP lookup failed", err);
      } finally {
        setChecked(true);
      }
    };
    run();
  }, []);

  if (!checked) return null;
  if (!blocked) return null;

  return (
    <div className="overlay">
      <div>
        <h2>Access restricted</h2>
        <p>Your region is not supported for lovely at this time.</p>
      </div>
    </div>
  );
}
