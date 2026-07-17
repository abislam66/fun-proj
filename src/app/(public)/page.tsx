import { VenueExplorer } from "@/components/venues/venue-explorer";
import { MOCK_VENUES } from "@/lib/venue-fixtures";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const values = await searchParams;
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  });

  return (
    <VenueExplorer initialQuery={params.toString()} venues={MOCK_VENUES} />
  );
}
