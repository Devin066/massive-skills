import { Dashboard } from "@/components/Dashboard";
import { configuredFeed } from "@/lib/relay";
import { parseTickers } from "@/lib/validate";

// Server component: reads config from server env (no NEXT_PUBLIC_*), hands plain props to the client.
export const dynamic = "force-dynamic";

export default function Page() {
  const watchlist = parseTickers(process.env.MASSIVE_WATCHLIST ?? "AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,SPY", 25);
  return <Dashboard watchlist={watchlist} feed={configuredFeed()} />;
}
