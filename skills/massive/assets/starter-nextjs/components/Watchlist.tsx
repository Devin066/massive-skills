"use client";

import { formatAsOf } from "@/lib/time";
import type { Quote } from "@/lib/types";

const price = (n: number | null) => (n == null ? "—" : n.toFixed(2));
const signed = (n: number | null, digits = 2, suffix = "") =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(digits)}${suffix}`;
const volume = (n: number | null) =>
  n == null ? "—" : Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

interface Props {
  quotes: Quote[];
  selected: string;
  onSelect: (ticker: string) => void;
}

export function Watchlist({ quotes, selected, onSelect }: Props) {
  return (
    <table className="watchlist">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Last</th>
          <th>Chg</th>
          <th>Chg %</th>
          <th>Volume</th>
          <th>As of</th>
        </tr>
      </thead>
      <tbody>
        {quotes.map((q) => {
          const dir = q.change == null || q.change === 0 ? "" : q.change > 0 ? "up" : "down";
          return (
            <tr key={q.ticker} className={q.ticker === selected ? "selected" : ""} onClick={() => onSelect(q.ticker)}>
              <td className="sym">{q.ticker}</td>
              <td>{price(q.price)}</td>
              <td className={dir}>{signed(q.change)}</td>
              <td className={dir}>{signed(q.changePct, 2, "%")}</td>
              <td>{volume(q.dayVolume)}</td>
              <td className="muted" title={q.source}>
                {q.asOf ? formatAsOf(q.asOf) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
