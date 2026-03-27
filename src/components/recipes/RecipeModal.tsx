import React, { useEffect, useMemo, useState } from "react";
import type { Ingredient, Product, RecipeUpsertItemDTO } from "../../types/pos";
import { posGetRecipe, posUpsertRecipe } from "../../api/posRecipes";
import { posSearchIngredients } from "../../api/posIngredients";

type Props = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
};

type SelectedItem = RecipeUpsertItemDTO & {
  ingredientName?: string;
};

export function RecipeModal({ open, onClose, product }: Props) {
  const productId = typeof product?.id === 'number' ? product.id : parseInt(String(product?.id || '0'));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<SelectedItem[]>([]);

  const [ingredientQuery, setIngredientQuery] = useState("");
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [searchingIngredients, setSearchingIngredients] = useState(false);

  const title = useMemo(() => {
    if (!product) return "Receta";
    return `Receta – ${product.name} (ID ${product.id})`;
  }, [product]);

  useEffect(() => {
    if (!open || !productId) return;

    (async () => {
      setError(null);
      setLoading(true);
      try {
        const recipe = await posGetRecipe(productId);
        setItems(
          recipe.map((ri) => ({
            ingredientId: ri.ingredient.id,
            ingredientName: ri.ingredient.name,
            quantityUnits: ri.quantityUnits,
          }))
        );
      } catch {
        setError("No se pudo cargar la receta.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, productId]);

  useEffect(() => {
    if (!open) return;

    const q = ingredientQuery.trim();
    if (q.length < 2) {
      setIngredientResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setSearchingIngredients(true);
      try {
        const res = await posSearchIngredients(q);
        setIngredientResults(res);
      } catch {
        setIngredientResults([]);
      } finally {
        setSearchingIngredients(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [ingredientQuery, open]);

  if (!open) return null;

  const addIngredient = (ingredient: Ingredient) => {
    setItems((prev) => {
      if (prev.some((x) => x.ingredientId === ingredient.id)) return prev;
      return [...prev, { ingredientId: ingredient.id, ingredientName: ingredient.name, quantityUnits: 1 }];
    });
  };

  const removeItem = (ingredientId: number) => {
    setItems((prev) => prev.filter((x) => x.ingredientId !== ingredientId));
  };

  const updateQty = (ingredientId: number, qty: number) => {
    setItems((prev) =>
      prev.map((x) => (x.ingredientId === ingredientId ? { ...x, quantityUnits: qty } : x))
    );
  };

  const onSave = async () => {
    if (!productId) return;

    for (const it of items) {
      if (!Number.isFinite(it.quantityUnits) || it.quantityUnits <= 0) {
        setError("Las cantidades deben ser mayores a 0.");
        return;
      }
    }

    setError(null);
    setSaving(true);
    try {
      await posUpsertRecipe(productId, {
        items: items.map(({ ingredientId, quantityUnits }) => ({ ingredientId, quantityUnits })),
      });
      onClose();
    } catch {
      setError("No se pudo guardar la receta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={styles.btn}>
            Cerrar
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div>Cargando receta…</div>
        ) : (
          <>
            <div style={styles.section}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Items</div>

              {items.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Sin items (receta vacía)</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {items.map((it) => (
                    <div key={it.ingredientId} style={styles.row}>
                      <div style={{ flex: 1 }}>
                        {it.ingredientName ?? `Ingrediente ID: ${it.ingredientId}`}
                      </div>

                      <input
                        type="number"
                        min={1}
                        value={it.quantityUnits}
                        onChange={(e) => updateQty(it.ingredientId, Number(e.target.value))}
                        style={styles.input}
                      />

                      <button onClick={() => removeItem(it.ingredientId)} style={styles.btnDanger}>
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Agregar ingrediente</div>

              <input
                value={ingredientQuery}
                onChange={(e) => setIngredientQuery(e.target.value)}
                placeholder="Buscar ingrediente (mín 2 letras)…"
                style={{ ...styles.input, width: "100%" }}
              />

              <div style={{ marginTop: 8, maxHeight: 180, overflow: "auto", border: "1px solid #eee" }}>
                {searchingIngredients ? (
                  <div style={{ padding: 8 }}>Buscando…</div>
                ) : ingredientResults.length === 0 ? (
                  <div style={{ padding: 8, opacity: 0.7 }}>Sin resultados</div>
                ) : (
                  ingredientResults.map((ing) => (
                    <div key={ing.id} style={styles.searchRow}>
                      <div style={{ flex: 1 }}>
                        {ing.name} (ID {ing.id}) — stock {ing.stockUnits}
                      </div>
                      <button onClick={() => addIngredient(ing)} style={styles.btn}>
                        Agregar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={styles.footer}>
              <button onClick={onSave} disabled={saving} style={styles.btnPrimary}>
                {saving ? "Guardando…" : "Guardar receta"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  modal: {
    width: 900,
    maxWidth: "100%",
    background: "#fff",
    borderRadius: 8,
    padding: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  section: { marginTop: 12 },
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    border: "1px solid #eee",
    padding: 8,
    borderRadius: 6,
  },
  searchRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: 8,
    borderBottom: "1px solid #eee",
  },
  footer: { display: "flex", justifyContent: "flex-end", marginTop: 16 },
  input: {
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #ccc",
    width: 120,
  },
  btn: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#f7f7f7",
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #1d4ed8",
    background: "#1d4ed8",
    color: "white",
    cursor: "pointer",
  },
  btnDanger: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #dc2626",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
  },
  error: {
    padding: 10,
    borderRadius: 6,
    background: "#fee2e2",
    color: "#7f1d1d",
    border: "1px solid #fecaca",
    marginBottom: 12,
  },
};