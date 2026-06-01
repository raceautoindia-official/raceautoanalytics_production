const content = `# Race Auto Analytics

Race Auto Analytics is an automotive market intelligence platform for vehicle sales forecasting, country-wise flash reports, OEM market share tracking, EV adoption insights, and segment-level market analysis.

## Core pages

- Home: https://raceautoanalytics.com/
- Flash Reports Overview: https://raceautoanalytics.com/flash-reports/overview
- Forecast Overview: https://raceautoanalytics.com/forecast/overview
- Country Data Coverage: https://raceautoanalytics.com/flash-reports/country-data
- Subscription Plans: https://raceautoanalytics.com/subscription

## Main topics

- Automotive sales forecast
- Vehicle market analytics
- Country-wise automotive flash reports
- OEM market share
- EV sales insights
- Passenger vehicles, commercial vehicles, two-wheelers, three-wheelers, tractors, buses, trucks, and construction equipment

## Contact

- Website: https://raceautoanalytics.com/
- Email: info@raceautoindia.com
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

