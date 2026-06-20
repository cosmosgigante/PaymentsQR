"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Eye, EyeOff, ArrowLeft, ChevronDown, ChevronUp, Camera, X, Pencil } from "lucide-react";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
};

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

type EditTarget = { item: MenuItem; categoryId: string } | null;

export default function MenuManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditTarget>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setItemForm({ name: "", description: "", price: "" });
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(false);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(item: MenuItem, categoryId: string) {
    setAddingItem(null);
    setEditingItem({ item, categoryId });
    setItemForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
    });
    setImagePreview(item.image);
    setImageFile(null);
    setRemoveImage(false);
    setUploadError(null);
  }

  function cancelEdit() {
    setEditingItem(null);
    resetForm();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("La imagen no puede superar 4MB");
      return;
    }
    setUploadError(null);
    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    const fd = new FormData();
    fd.append("file", imageFile);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setUploadError(data.error ?? "Error al subir imagen");
      return null;
    }
    return data.url as string;
  }

  function updateItemInState(updated: MenuItem) {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((i) => i.id === updated.id ? updated : i),
      }))
    );
  }

  async function createCategory() {
    if (!newCatName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories((prev) => [...prev, { ...data, items: [] }]);
      setNewCatName("");
      setExpandedCat(data.id);
    }
    setSaving(false);
  }

  async function createItem(categoryId: string) {
    if (!itemForm.name.trim() || !itemForm.price) return;
    setSaving(true);
    setUploadError(null);

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (!imageUrl) { setSaving(false); return; }
    }

    const res = await fetch("/api/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        ...itemForm,
        price: parseFloat(itemForm.price),
        image: imageUrl,
      }),
    });
    const item = await res.json();
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) => c.id === categoryId ? { ...c, items: [...c.items, item] } : c)
      );
      resetForm();
      setAddingItem(null);
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editingItem || !itemForm.name.trim() || !itemForm.price) return;
    setSaving(true);
    setUploadError(null);

    let imageUrl: string | null | undefined = undefined;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (!imageUrl) { setSaving(false); return; }
    } else if (removeImage) {
      imageUrl = null;
    }

    const body: Record<string, unknown> = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      price: parseFloat(itemForm.price),
    };
    if (imageUrl !== undefined) body.image = imageUrl;

    const res = await fetch(`/api/menu/items/${editingItem.item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    if (res.ok) {
      updateItemInState(updated);
      cancelEdit();
    }
    setSaving(false);
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    const updated = await res.json();
    if (res.ok) updateItemInState(updated);
  }

  async function deleteItem(item: MenuItem, categoryId: string) {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    const res = await fetch(`/api/menu/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) => c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c)
      );
    }
  }

  const isEditing = (itemId: string) => editingItem?.item.id === itemId;

  return (
    <div className="min-h-screen-dvh bg-slate-100">
      <div
        className="relative overflow-hidden px-4 sm:px-5 pb-6"
        style={{
          background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)",
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        </div>
        <div className="relative max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <h1 className="font-bold text-white text-lg">Menú</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 space-y-3">
        {/* Nueva categoría */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Nueva categoría
          </p>
          <div className="flex gap-2">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              placeholder="Ej: Entradas, Bebidas..."
              className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
            />
            <button
              onClick={createCategory}
              disabled={saving || !newCatName.trim()}
              className="bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[48px] flex-shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
              Crear
            </button>
          </div>
        </div>

        {/* Categorías */}
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <button
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-zinc-50 transition-colors min-h-[56px]"
            >
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-zinc-900 text-[15px]">{cat.name}</h3>
                <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {cat.items.length}
                </span>
              </div>
              {expandedCat === cat.id
                ? <ChevronUp size={16} className="text-zinc-400 flex-shrink-0" />
                : <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />
              }
            </button>

            <AnimatePresence initial={false}>
              {expandedCat === cat.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="border-t border-zinc-50">
                    {cat.items.map((item) => (
                      <div key={item.id}>
                        {/* Fila del item */}
                        {!isEditing(item.id) && (
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50 last:border-0 min-h-[60px]">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-zinc-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-zinc-50 flex items-center justify-center">
                                <Camera size={14} className="text-zinc-300" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm leading-snug ${item.available ? "text-zinc-900" : "text-zinc-400 line-through"}`}>
                                {item.name}
                              </p>
                              <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                                ${item.price.toLocaleString("es-AR")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => startEdit(item, cat.id)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-300 active:text-blue-600 active:bg-blue-50 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => toggleAvailable(item)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                  item.available
                                    ? "text-emerald-600 active:bg-emerald-50"
                                    : "text-zinc-300 active:bg-zinc-50"
                                }`}
                              >
                                {item.available ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
                              <button
                                onClick={() => deleteItem(item, cat.id)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-300 active:text-red-500 active:bg-red-50 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Formulario de edición inline */}
                        {isEditing(item.id) && (
                          <div className="px-4 py-3 border-b border-zinc-50 bg-blue-50/30">
                            <ItemForm
                              form={itemForm}
                              setForm={setItemForm}
                              imagePreview={imagePreview}
                              fileInputRef={fileInputRef}
                              onFileChange={handleFileChange}
                              onClearImage={clearImage}
                              uploadError={uploadError}
                              saving={saving}
                              onCancel={cancelEdit}
                              onSave={saveEdit}
                              saveLabel="Guardar cambios"
                              savingLabel="Guardando..."
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Agregar item */}
                    <div className="p-4">
                      {addingItem === cat.id ? (
                        <ItemForm
                          form={itemForm}
                          setForm={setItemForm}
                          imagePreview={imagePreview}
                          fileInputRef={fileInputRef}
                          onFileChange={handleFileChange}
                          onClearImage={clearImage}
                          uploadError={uploadError}
                          saving={saving}
                          onCancel={() => { setAddingItem(null); resetForm(); }}
                          onSave={() => createItem(cat.id)}
                          saveLabel="Guardar"
                          savingLabel="Subiendo..."
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingItem(null); resetForm(); setAddingItem(cat.id); }}
                          className="w-full border border-dashed border-zinc-200 active:border-zinc-400 text-zinc-400 py-3.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          <Plus size={15} strokeWidth={2} />
                          Agregar plato
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <BookOpenIcon />
            <p className="text-sm mt-3">Creá tu primera categoría para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Formulario reutilizable para crear y editar ── */

type ItemFormProps = {
  form: { name: string; description: string; price: string };
  setForm: (f: { name: string; description: string; price: string }) => void;
  imagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  uploadError: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  savingLabel: string;
};

function ItemForm({ form, setForm, imagePreview, fileInputRef, onFileChange, onClearImage, uploadError, saving, onCancel, onSave, saveLabel, savingLabel }: ItemFormProps) {
  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Nombre del plato *"
        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
      />
      <input
        value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
        placeholder="Precio *"
        type="number"
        step="0.01"
        inputMode="decimal"
        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
      />
      <input
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Descripción"
        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      {imagePreview ? (
        <div className="relative rounded-xl overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full object-cover"
            style={{ aspectRatio: "16/9" }}
          />
          <button
            onClick={onClearImage}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border border-dashed border-zinc-200 active:border-zinc-400 text-zinc-400 py-3.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Camera size={15} />
          Agregar foto (opcional)
        </button>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 px-1">{uploadError}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 border border-zinc-200 text-zinc-600 py-3 rounded-xl text-sm font-medium active:bg-zinc-50 transition-colors min-h-[48px]"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name || !form.price}
          className="flex-1 bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors min-h-[48px]"
        >
          {saving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
