# Train finder mobile app

Expo SDK 58 / React Native app using Expo Router. It currently provides offline train search and route details from the repository's schedule snapshot.

## Run

```sh
npm install
npm run start
```

The schedule snapshot is bundled into the app. Refresh it from the repository root with:

```sh
cd mobile
npm run sync:data
```

The repository snapshot is incomplete and is not live train or seat availability data.

## Live seat availability integration

Live seat search is wired to an explicitly configured authorized service. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_AVAILABILITY_ENDPOINT` to an HTTPS endpoint that accepts `GET` parameters `from_city`, `to_city`, `date_of_journey` (`YYYY-MM-DD`), and `seat_class`. This variable is a public endpoint URL, not a place for API secrets. The service should return JSON containing `data.trains` (or `trains`), with each train shaped like:

```json
{
  "data": {
    "trains": [
      {
        "trip_number": "SUBORNO EXPRESS (701)",
        "seat_types": [
          {
            "type": "S_CHAIR",
            "fare": 405,
            "seat_counts": { "online": 12 }
          }
        ]
      }
    ]
  }
}
```

No availability endpoint is configured by default. Configure only a backend integration you are authorized to use; the mobile app does not load the official website in a WebView, collect railway passwords or OTPs, or read/replay browser session tokens. Authentication for this app and any authorized provider should use their documented mobile/API flow.
