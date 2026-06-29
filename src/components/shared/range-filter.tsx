"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RANGE_PRESETS, type DateRangePreset } from "@/lib/dates";

export type RangeValue = {
  preset: DateRangePreset;
  from: string;
  to: string;
};

export function RangeFilter({
  value,
  onChange,
}: {
  value: RangeValue;
  onChange: (value: RangeValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select
          value={value.preset}
          onValueChange={(v) =>
            onChange({ ...value, preset: (v as DateRangePreset) ?? "TODAY" })
          }
          items={RANGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.preset === "CUSTOM" ? (
        <>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              className="w-40"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              className="w-40"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
