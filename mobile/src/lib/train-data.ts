import scheduleSnapshot from "../../data/train-schedules.json";

export type TrainStop = {
  city: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  halt?: string | null;
  duration?: string | null;
};

export type Train = {
  train_number: string;
  origin_city: string;
  destination_city: string;
  opening_time?: string | null;
  fetch_error?: string | null;
  schedule: {
    days: string[];
    routes: TrainStop[];
    total_duration?: string | null;
    train_name: string;
  };
};

type ScheduleDocument = {
  source?: { retrieved_at?: string };
  summary?: { complete?: boolean; schedules_fetched?: number; unique_train_numbers?: number };
  trains?: Train[];
};

const snapshot = scheduleSnapshot as ScheduleDocument;

export const trains = (snapshot.trains ?? [])
  .filter((train) => train.schedule?.train_name && train.schedule.routes?.length)
  .sort((a, b) => a.schedule.train_name.localeCompare(b.schedule.train_name));

export const scheduleSnapshotInfo = {
  retrievedAt: snapshot.source?.retrieved_at ?? null,
  complete: snapshot.summary?.complete ?? false,
  fetched: snapshot.summary?.schedules_fetched ?? trains.length,
  total: snapshot.summary?.unique_train_numbers ?? trains.length,
};

export function searchTrains(query: string): Train[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return trains;

  return trains.filter((train) => {
    const searchable = [
      train.train_number,
      train.schedule.train_name,
      train.origin_city,
      train.destination_city,
      ...train.schedule.routes.map((stop) => stop.city),
    ];
    return searchable.some((value) => value.toLocaleLowerCase().includes(normalized));
  });
}

export function findTrain(number: string | undefined): Train | undefined {
  return trains.find((train) => train.train_number === number);
}
