"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  resolveTheme,
  type ThemeItem,
  type ThemeSectionId,
} from "@/lib/aigocy";
import type { SiteSettingsPayload } from "@/lib/site-config";

export function ThemeEditor({
  settings,
  setSettings,
  disabled,
  uploadImage,
  uploadingField,
}: {
  settings: SiteSettingsPayload;
  setSettings: Dispatch<SetStateAction<SiteSettingsPayload>>;
  disabled: boolean;
  uploadImage: (
    file: File,
    folder: string,
    onUploaded: (url: string) => void,
    fieldKey: string,
  ) => Promise<void>;
  uploadingField: string | null;
}) {
  const theme = resolveTheme(settings.theme);
  const [active, setActive] = useState<ThemeSectionId>("process");
  const section = theme.sections.find((s) => s.id === active)!;
  const field =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50";
  const updateSection = (change: Partial<typeof section>) =>
    setSettings((current) => ({
      ...current,
      theme: {
        ...resolveTheme(current.theme),
        sections: resolveTheme(current.theme).sections.map((s) =>
          s.id === active ? { ...s, ...change } : s,
        ),
      },
    }));
  const updateItem = (index: number, change: Partial<ThemeItem>) => {
    const sectionId = active,
      itemId = section.items[index].id;
    setSettings((current) => {
      const currentTheme = resolveTheme(current.theme);
      return {
        ...current,
        theme: {
          ...currentTheme,
          sections: currentTheme.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  items: s.items.map((item) =>
                    item.id === itemId ? { ...item, ...change } : item,
                  ),
                }
              : s,
          ),
        },
      };
    });
  };
  const move = (index: number, delta: number) => {
    const items = [...section.items];
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    updateSection({ items });
  };
  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-xl font-semibold">Aigocy tema içerikleri</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Projeler, faaliyetler, blog, SSS ve sayılar mevcut verilerden gelir.
          Burada yeni tema bölümlerini düzenleyebilirsiniz. Boş ekip, görüş ve
          iş ortağı bölümleri yayınlanmaz. Yalnızca yayın izni alınmış kişi ve
          görüşleri ekleyin.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label>
          Ana sayfa düzeni
          <select
            disabled={disabled}
            className={field}
            value={theme.home_variant}
            onChange={(e) =>
              setSettings((c) => ({
                ...c,
                theme: {
                  ...resolveTheme(c.theme),
                  home_variant: e.target.value as "1" | "2",
                },
              }))
            }
          >
            <option value="1">Home — gradyan</option>
            <option value="2">Home 2 — video</option>
          </select>
        </label>
        <label>
          Hero arka planı
          <input
            disabled={disabled}
            className={field}
            placeholder="/görsel veya https://…"
            value={theme.hero_background_url}
            onChange={(e) =>
              setSettings((c) => ({
                ...c,
                theme: {
                  ...resolveTheme(c.theme),
                  hero_background_url: e.target.value,
                },
              }))
            }
          />
        </label>
        <label>
          Hero video URL
          <input
            disabled={disabled}
            className={field}
            placeholder="https://…/video.mp4"
            value={theme.video_url}
            onChange={(e) =>
              setSettings((c) => ({
                ...c,
                theme: { ...resolveTheme(c.theme), video_url: e.target.value },
              }))
            }
          />
        </label>
      </div>
      <details className="rounded-xl border border-zinc-200 p-4">
        <summary className="cursor-pointer font-semibold">
          Ana sayfa bölüm sırası
        </summary>
        <p className="my-3 text-sm text-zinc-500">
          Mevcut ana sayfa bölüm görünürlükleri korunur. Yeni bölümleri aşağıdan
          açıp kapatabilirsiniz.
        </p>
        {theme.home_block_order.map((id, index) => (
          <div
            key={id}
            className="flex items-center justify-between border-b py-2 text-sm"
          >
            <span>{theme.sections.find((s) => s.id === id)?.title || id}</span>
            <div className="flex gap-4">
              {[-1, 1].map((delta) => (
                <button
                  type="button"
                  key={delta}
                  disabled={
                    disabled ||
                    index + delta < 0 ||
                    index + delta >= theme.home_block_order.length
                  }
                  aria-label={`${id} ${delta === -1 ? "yukarı" : "aşağı"} taşı`}
                  onClick={() => {
                    const order = [...theme.home_block_order];
                    [order[index], order[index + delta]] = [
                      order[index + delta],
                      order[index],
                    ];
                    setSettings((c) => ({
                      ...c,
                      homepage: {
                        ...c.homepage,
                        block_order: order.filter((id) =>
                          c.homepage.block_order.includes(
                            id as (typeof c.homepage.block_order)[number],
                          ),
                        ) as typeof c.homepage.block_order,
                      },
                      theme: {
                        ...resolveTheme(c.theme),
                        home_block_order: order,
                      },
                    }));
                  }}
                >
                  {delta === -1 ? (
                    <ArrowUp size={16} />
                  ) : (
                    <ArrowDown size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </details>
      <label>
        Bölüm
        <select
          className={field}
          value={active}
          onChange={(e) => setActive(e.target.value as ThemeSectionId)}
        >
          {theme.sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.id})
            </option>
          ))}
        </select>
      </label>
      <label className="flex gap-2">
        <input
          disabled={disabled}
          type="checkbox"
          checked={section.enabled}
          onChange={(e) => updateSection({ enabled: e.target.checked })}
        />
        Bölümü yayınla
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          Bölüm başlığı
          <input
            disabled={disabled}
            className={field}
            value={section.title}
            onChange={(e) => updateSection({ title: e.target.value })}
          />
        </label>
        <label>
          Açıklama
          <textarea
            disabled={disabled}
            className={field}
            value={section.description}
            onChange={(e) => updateSection({ description: e.target.value })}
          />
        </label>
      </div>
      {section.items.map((item, index) => (
        <fieldset
          key={item.id}
          className="space-y-3 rounded-2xl border border-zinc-200 p-4"
        >
          <legend>{index + 1}. kart</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                "title",
                "subtitle",
                "description",
                "value",
                "label",
                "href",
                "image_url",
              ] as const
            ).map((key) => (
              <label key={key}>
                {
                  {
                    title: "Başlık / isim",
                    subtitle: "Rol / alt başlık",
                    description: "Açıklama / görüş",
                    value: "Sayı / yıl / etiket",
                    label: "Buton yazısı",
                    href: "Bağlantı",
                    image_url: "Görsel URL",
                  }[key]
                }
                <input
                  disabled={disabled}
                  className={field}
                  value={item[key] || ""}
                  onChange={(e) => updateItem(index, { [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              İkon
              <select
                disabled={disabled}
                className={field}
                value={item.icon || "sparkles"}
                onChange={(e) => updateItem(index, { icon: e.target.value })}
              >
                {["compass", "users", "award", "book", "sparkles"].map(
                  (icon) => (
                    <option key={icon}>{icon}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Özellikler (her satır bir madde)
              <textarea
                disabled={disabled}
                className={field}
                value={(item.details || []).join("\n")}
                onChange={(e) =>
                  updateItem(index, {
                    details: e.target.value.split("\n").filter(Boolean),
                  })
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            Görsel yükle
            <input
              disabled={disabled || !!uploadingField}
              type="file"
              accept="image/*"
              className={field}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void uploadImage(
                    file,
                    "theme",
                    (url) => updateItem(index, { image_url: url }),
                    `theme-${active}-${item.id}`,
                  );
              }}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              aria-label="Yukarı taşı"
            >
              <ArrowUp size={18} />
            </button>
            <button
              type="button"
              disabled={disabled || index === section.items.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Aşağı taşı"
            >
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                updateSection({
                  items: section.items.filter((_, i) => i !== index),
                })
              }
              className="flex gap-2 text-sm text-red-600"
            >
              <Trash2 size={16} />
              Kartı kaldır
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={disabled || section.items.length >= 50}
        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-white"
        onClick={() =>
          updateSection({
            items: [
              ...section.items,
              {
                id: crypto.randomUUID(),
                title: "Yeni kart",
                description: "",
                icon: "sparkles",
              },
            ],
          })
        }
      >
        <Plus size={18} />
        Kart ekle
      </button>
    </div>
  );
}
