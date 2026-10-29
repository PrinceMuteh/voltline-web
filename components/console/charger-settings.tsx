"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

type Item = Schemas["ConfigItemDto"];

/**
 * The charger's own settings, read live (GetVariables on 2.0.1, GetConfiguration on 1.6J)
 * and changed one at a time (SetVariables / ChangeConfiguration). Nothing is cached: what
 * you see is what the charger answered just now.
 */
export function ChargerSettings({
  chargerId,
  connected,
  canEdit,
}: {
  chargerId: string;
  connected: boolean;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<Item[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = async () => {
    setLoading(true);
    setError(undefined);
    const { data, error: apiError } = await api.GET(
      "/v1/console/chargers/{id}/configuration",
      { params: { path: { id: chargerId } } },
    );
    setLoading(false);
    if (apiError || !data) return setError(errorMessage(apiError));
    setItems(data);
  };

  return (
    <section aria-labelledby="settings-heading" className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="settings-heading"
          className="text-[13px] font-medium text-ink-3"
        >
          Charger settings
        </h3>
        <Button
          variant="ghost"
          className="h-8 px-2.5 text-[13px]"
          loading={loading}
          disabled={!connected}
          onClick={() => void load()}
        >
          {items ? "Reload" : "Read from charger"}
        </Button>
      </div>
      {!connected && !items && (
        <p className="mt-1 text-[13px] text-ink-3">
          Settings can be read while the charger is connected.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[13px] text-error">
          {error}
        </p>
      )}
      {items && (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {items.map((item) => (
            <SettingRow
              key={`${item.component}/${item.key}`}
              item={item}
              chargerId={chargerId}
              canEdit={canEdit && !item.readonly && item.note === null}
              onSaved={(value) =>
                setItems((list) =>
                  list?.map((i) =>
                    i.key === item.key && i.component === item.component
                      ? { ...i, value }
                      : i,
                  ),
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SettingRow({
  item,
  chargerId,
  canEdit,
  onSaved,
}: {
  item: Item;
  chargerId: string;
  canEdit: boolean;
  onSaved: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.value ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data, error } = await api.PUT(
      "/v1/console/chargers/{id}/configuration",
      {
        params: { path: { id: chargerId } },
        body: { component: item.component, key: item.key, value },
      },
    );
    setSaving(false);
    if (error || !data) {
      toast.error(`${item.key} not changed`, {
        description: errorMessage(error),
      });
      return;
    }
    if (data.status === "Accepted" || data.status === "RebootRequired") {
      toast.success(`${item.key} set to ${value}`, {
        description:
          data.status === "RebootRequired"
            ? "The charger applies it after a reset."
            : "The charger accepted the change.",
      });
      onSaved(value);
      setEditing(false);
    } else {
      toast.error(`${item.key} not changed`, {
        description: `The charger replied ${data.status}.`,
      });
    }
  };

  return (
    <li className="px-3 py-2 text-[13px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono font-medium break-all">{item.key}</p>
          {item.component && (
            <p className="font-mono text-[12px] text-ink-3">{item.component}</p>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-ink-2 break-all">
              {item.value ?? item.note ?? "–"}
            </span>
            {item.readonly && (
              <span className="text-[11.5px] text-ink-3">read-only</span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[12.5px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
                aria-label={`Change ${item.key}`}
              >
                Change
              </button>
            )}
          </div>
        )}
      </div>
      {editing && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label
            className="sr-only"
            htmlFor={`setting-${item.component}-${item.key}`}
          >
            New value for {item.key}
          </label>
          <input
            id={`setting-${item.component}-${item.key}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-control border border-line-strong px-2 font-mono text-[16px] outline-none focus:border-ink-3 sm:text-[13px]"
          />
          <Button
            type="submit"
            className="h-8 px-3 text-[13px]"
            loading={saving}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-2 text-[13px]"
            onClick={() => {
              setValue(item.value ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </li>
  );
}
