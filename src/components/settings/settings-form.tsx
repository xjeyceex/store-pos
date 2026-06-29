"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/shared/field-error";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";
import { updateSettings } from "@/lib/actions/settings";
import type { StoreSettings } from "@/lib/queries/settings";

const CURRENCIES = [
  { value: "PHP", label: "Philippine Peso (PHP)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "SGD", label: "Singapore Dollar (SGD)" },
];

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof settingsSchema>, unknown, SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: settings.storeName,
      currency: settings.currency,
      defaultLowStockThreshold: settings.defaultLowStockThreshold,
    },
  });

  async function onSubmit(values: SettingsInput) {
    const result = await updateSettings(values);
    if (result.success) toast.success(result.message ?? "Saved");
    else toast.error(result.error);
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Store Settings</CardTitle>
        <CardDescription>
          Configure your store name, currency, and stock alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input id="storeName" {...register("storeName")} />
            <FieldError message={errors.storeName?.message} />
          </div>

          <div className="grid gap-2">
            <Label>Currency</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  items={CURRENCIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.currency?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="defaultLowStockThreshold">
              Default Low Stock Threshold
            </Label>
            <Input
              id="defaultLowStockThreshold"
              type="number"
              min="0"
              inputMode="numeric"
              {...register("defaultLowStockThreshold")}
            />
            <p className="text-xs text-muted-foreground">
              Used as the default minimum stock level for new products.
            </p>
            <FieldError message={errors.defaultLowStockThreshold?.message} />
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
