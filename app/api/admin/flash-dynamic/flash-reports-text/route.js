import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [results] = await db.execute(
      "SELECT * FROM flash_reports_text LIMIT 1"
    );
    return NextResponse.json(results[0] || {});
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

    const [
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
      overall_oem_main,
      overall_oem_secondary,
      overall_heading,
      alternative_fuel_heading,
      flash_reports_edition, // <- NEW FIELD
    ] = [
      body.twowheeler,
      body.highlighted_twowheeler,
      body.twowheeler_heading,
      body.threewheeler,
      body.highlighted_threewheeler,
      body.threewheeler_heading,
      body.commercial_vehicle,
      body.highlighted_commercial_vehicle,
      body.commercial_vehicle_heading,
      body.passenger_vehicle_main,
      body.passenger_vehicle_secondary,
      body.highlighted_passenger_vehicle,
      body.passenger_vehicle_heading,
      body.tractor,
      body.highlighted_tractor,
      body.tractor_heading,
      body.truck,
      body.truck_heading,
      body.bus,
      body.bus_heading,
      body.overall_oem_main,
      body.overall_oem_secondary,
      body.overall_heading,
      body.alternative_fuel_heading,
      body.flash_reports_edition, // <- NEW FIELD
    ];

    const [rows] = await db.execute(
      "SELECT id FROM flash_reports_text LIMIT 1"
    );

    if (rows.length > 0) {
      const id = rows[0].id;
      await db.execute(
        `UPDATE flash_reports_text SET
          twowheeler = ?, highlighted_twowheeler = ?, twowheeler_heading = ?,
          threewheeler = ?, highlighted_threewheeler = ?, threewheeler_heading = ?,
          commercial_vehicle = ?, highlighted_commercial_vehicle = ?, commercial_vehicle_heading = ?,
          passenger_vehicle_main = ?, passenger_vehicle_secondary = ?, highlighted_passenger_vehicle = ?, passenger_vehicle_heading = ?,
          tractor = ?, highlighted_tractor = ?, tractor_heading = ?,
          truck = ?, truck_heading = ?, bus = ?, bus_heading = ?,
          overall_oem_main = ?, overall_oem_secondary = ?, overall_heading = ?, alternative_fuel_heading = ?,
          flash_reports_edition = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
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
          overall_oem_main,
          overall_oem_secondary,
          overall_heading,
          alternative_fuel_heading,
          flash_reports_edition, // <- NEW FIELD
          id,
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO flash_reports_text (
          twowheeler, highlighted_twowheeler, twowheeler_heading,
          threewheeler, highlighted_threewheeler, threewheeler_heading,
          commercial_vehicle, highlighted_commercial_vehicle, commercial_vehicle_heading,
          passenger_vehicle_main, passenger_vehicle_secondary, highlighted_passenger_vehicle, passenger_vehicle_heading,
          tractor, highlighted_tractor, tractor_heading,
          truck, truck_heading, bus, bus_heading,
          overall_oem_main, overall_oem_secondary, overall_heading, alternative_fuel_heading,
          flash_reports_edition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          overall_oem_main,
          overall_oem_secondary,
          overall_heading,
          alternative_fuel_heading,
          flash_reports_edition, // <- NEW FIELD
        ]
      );
    }

    return NextResponse.json({ message: "Flash report saved successfully" });
  } catch (err) {
    console.error("Error saving flash report:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
