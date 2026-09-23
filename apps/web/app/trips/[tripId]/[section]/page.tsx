import { notFound } from 'next/navigation';
import { parseRoute } from '@/lib/navigation.mjs';

export default async function TripPage({params}:{params:Promise<{tripId:string;section:string}>}) {
  const {tripId,section}=await params;
  const route=parseRoute(`/trips/${tripId}/${section}`);
  if(route.kind!=='trip')notFound();
  return null;
}
