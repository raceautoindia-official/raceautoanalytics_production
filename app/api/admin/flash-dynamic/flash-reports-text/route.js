import db from "@/lib/db";
import { NextResponse } from "next/server";
import { normalizeCountryKey } from "@/lib/flashReportCountry";

function buildPayload(body = {}) {
  return {
    twowheeler: body.twowheeler ?? null,
    highlighted_twowheeler: body.highlighted_twowheeler ?? null,
    twowheeler_heading: body.twowheeler_heading ?? null,

    threewheeler: body.threewheeler ?? null,
    highlighted_threewheeler: body.highlighted_threewheeler ?? null,
    threewheeler_heading: body.threewheeler_heading ?? null,

    commercial_vehicle: body.commercial_vehicle ?? null,
    highlighted_commercial_vehicle: body.highlighted_commercial_vehicle ?? null,
    commercial_vehicle_heading: body.commercial_vehicle_heading ?? null,

    passenger_vehicle_main: body.passenger_vehicle_main ?? null,
    passenger_vehicle_secondary: body.passenger_vehicle_secondary ?? null,
    highlighted_passenger_vehicle: body.highlighted_passenger_vehicle ?? null,
    passenger_vehicle_heading: body.passenger_vehicle_heading ?? null,

    tractor: body.tractor ?? null,
    highlighted_tractor: body.highlighted_tractor ?? null,
    tractor_heading: body.tractor_heading ?? null,

    truck: body.truck ?? null,
    truck_heading: body.truck_heading ?? null,

    bus: body.bus ?? null,
    bus_heading: body.bus_heading ?? null,

    construction_equipment: body.construction_equipment ?? null,
    highlighted_construction_equipment:
      body.highlighted_construction_equipment ?? null,

    overall_oem_main: body.overall_oem_main ?? null,
    overall_oem_secondary: body.overall_oem_secondary ?? null,
    overall_heading: body.overall_heading ?? null,
    alternative_fuel_heading: body.alternative_fuel_heading ?? null,

    flash_reports_edition: body.flash_reports_edition ?? null,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCountry = searchParams.get("country");
    const countryKey = normalizeCountryKey(rawCountry);

    const [rows] = await db.execute(
      `
      SELECT *
      FROM flash_reports_text
      WHERE country_key = ?
      LIMIT 1
      `,
      [countryKey]
    );

    if (rows.length > 0) {
      return NextResponse.json(rows[0]);
    }

    if (countryKey !== "india") {
      const [indiaRows] = await db.execute(
        `
        SELECT *
        FROM flash_reports_text
        WHERE country_key = 'india'
        LIMIT 1
        `
      );

      if (indiaRows.length > 0) {
        return NextResponse.json(indiaRows[0]);
      }
    }

    return NextResponse.json({});
  } catch (err) {
    console.error("Error fetching flash report:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const countryKey = normalizeCountryKey(body.country);
    const payload = buildPayload(body);

    console.log("POST body country:", body.country);
    console.log("Normalized countryKey:", countryKey);

    await db.execute(
      `
      INSERT INTO flash_reports_text (
        country_key,
        twowheeler,
        highlighted_twowheeler,
        twowheeler_heading,
        threewheeler,
        highlighted_threewheeler,
        threewheeler_heading,
        commercial_vehicle,
        highlighted_commercial_vehicle,
        commercial_vehicle_heading,
        passenger_vehicle_main,
        passenger_vehicle_secondary,
        highlighted_passenger_vehicle,
        passenger_vehicle_heading,
        tractor,
        highlighted_tractor,
        tractor_heading,
        truck,
        truck_heading,
        bus,
        bus_heading,
        construction_equipment,
        highlighted_construction_equipment,
        overall_oem_main,
        overall_oem_secondary,
        overall_heading,
        alternative_fuel_heading,
        flash_reports_edition,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        twowheeler = VALUES(twowheeler),
        highlighted_twowheeler = VALUES(highlighted_twowheeler),
        twowheeler_heading = VALUES(twowheeler_heading),
        threewheeler = VALUES(threewheeler),
        highlighted_threewheeler = VALUES(highlighted_threewheeler),
        threewheeler_heading = VALUES(threewheeler_heading),
        commercial_vehicle = VALUES(commercial_vehicle),
        highlighted_commercial_vehicle = VALUES(highlighted_commercial_vehicle),
        commercial_vehicle_heading = VALUES(commercial_vehicle_heading),
        passenger_vehicle_main = VALUES(passenger_vehicle_main),
        passenger_vehicle_secondary = VALUES(passenger_vehicle_secondary),
        highlighted_passenger_vehicle = VALUES(highlighted_passenger_vehicle),
        passenger_vehicle_heading = VALUES(passenger_vehicle_heading),
        tractor = VALUES(tractor),
        highlighted_tractor = VALUES(highlighted_tractor),
        tractor_heading = VALUES(tractor_heading),
        truck = VALUES(truck),
        truck_heading = VALUES(truck_heading),
        bus = VALUES(bus),
        bus_heading = VALUES(bus_heading),
        construction_equipment = VALUES(construction_equipment),
        highlighted_construction_equipment = VALUES(highlighted_construction_equipment),
        overall_oem_main = VALUES(overall_oem_main),
        overall_oem_secondary = VALUES(overall_oem_secondary),
        overall_heading = VALUES(overall_heading),
        alternative_fuel_heading = VALUES(alternative_fuel_heading),
        flash_reports_edition = VALUES(flash_reports_edition),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        countryKey,
        payload.twowheeler,
        payload.highlighted_twowheeler,
        payload.twowheeler_heading,
        payload.threewheeler,
        payload.highlighted_threewheeler,
        payload.threewheeler_heading,
        payload.commercial_vehicle,
        payload.highlighted_commercial_vehicle,
        payload.commercial_vehicle_heading,
        payload.passenger_vehicle_main,
        payload.passenger_vehicle_secondary,
        payload.highlighted_passenger_vehicle,
        payload.passenger_vehicle_heading,
        payload.tractor,
        payload.highlighted_tractor,
        payload.tractor_heading,
        payload.truck,
        payload.truck_heading,
        payload.bus,
        payload.bus_heading,
        payload.construction_equipment,
        payload.highlighted_construction_equipment,
        payload.overall_oem_main,
        payload.overall_oem_secondary,
        payload.overall_heading,
        payload.alternative_fuel_heading,
        payload.flash_reports_edition,
      ]
    );

    return NextResponse.json({
      message: "Flash report saved successfully",
      country: countryKey,
    });
  } catch (err) {
    console.error("Error saving flash report:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}