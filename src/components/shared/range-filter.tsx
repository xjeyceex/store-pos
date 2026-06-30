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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid w-full gap-1.5 sm:w-auto">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select
          value={value.preset}
          onValueChange={(v) =>
            onChange({ ...value, preset: (v as DateRangePreset) ?? "TODAY" })
          }
          items={RANGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        >
          <SelectTrigger className="w-full sm:w-44">
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
          <div className="grid w-full gap-1.5 sm:w-auto">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              className="w-full sm:w-40"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div className="grid w-full gap-1.5 sm:w-auto">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              className="w-full sm:w-40"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
