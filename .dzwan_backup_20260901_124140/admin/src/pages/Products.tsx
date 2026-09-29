
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Package,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageProducts } from "../lib/permissions";

type ProductStatus = "active" | "inactive";

interface Product {
  _id: string;
  establishmentId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

interface Establishment {
  _id: string;
  name: string;
  type: "restaurant" | "shop";
  status: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [establishments, setEstablishments] = useState<
    Establishment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);

  const [selectedEstablishment, setSelectedEstablishment] =
    useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | ProductStatus
  >("all");

  const [openId, setOpenId] = useState<string | null>(null);

  const [modal, setModal] = useState<
    "create" | "edit" | null
  >(null);

  const [editProduct, setEditProduct] =
    useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] =
    useState<ProductStatus>("active");

  async function loadEstablishments() {
    try {
      const response = await api.get("/establishments");

      const data = Array.isArray(
        response.data?.establishments,
      )
        ? response.data.establishments
        : [];

      setEstablishments(data);

      if (!selectedEstablishment && data.length > 0) {
        setSelectedEstablishment(data[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل المطاعم والمحلات.",
        ),
      );
    }
  }

  async function loadProducts() {
    if (!selectedEstablishment) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          establishmentId: selectedEstablishment,
        },
      });

      setProducts(
        Array.isArray(response.data?.products)
          ? response.data.products
          : [],
      );
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل المنتجات.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCurrentRole() {
      try {
        const response = await api.get("/auth/me");
        setCurrentRole(
          response.data?.user?.role,
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "Role loading error:",
            error,
          );
        }
      }
    }

    void loadCurrentRole();
  }, []);

  useEffect(() => {
    void loadEstablishments();
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [selectedEstablishment]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setStatus("active");
    setEditProduct(null);
  }

  function openCreate() {
    resetForm();
    setModal("create");
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(String(product.price));
    setStatus(product.status);
    setModal("edit");
  }

  async function saveProduct() {
    if (!canManageProducts(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة المنتجات.",
      );
      return;
    }


    const numericPrice = Number(price);

    if (!name.trim()) {
      setError("اسم المنتج مطلوب.");
      return;
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError("سعر المنتج غير صحيح.");
      return;
    }

    if (modal === "create" && !selectedEstablishment) {
      setError("اختر المنشأة أولًا.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (modal === "create") {
        await api.post("/products", {
          establishmentId: selectedEstablishment,
          name: name.trim(),
          description:
            description.trim() || null,
          price: numericPrice,
          status,
        });
      } else if (modal === "edit" && editProduct) {
        await api.patch(
          `/products/${editProduct._id}`,
          {
            name: name.trim(),
            description:
              description.trim() || null,
            price: numericPrice,
            status,
          },
        );
      }

      setModal(null);
      resetForm();
      await loadProducts();
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر حفظ المنتج.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!canManageProducts(currentRole)) {
      setError(
        "ليس لديك صلاحية لحذف المنتجات.",
      );
      return;
    }


    if (
      !window.confirm(
        `هل أنت متأكد من حذف "${product.name}"؟`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/products/${product._id}`,
      );

      await loadProducts();
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف المنتج.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = useMemo(() => {
    if (statusFilter === "all") {
      return products;
    }

    return products.filter(
      (product) =>
        product.status === statusFilter,
    );
  }, [products, statusFilter]);

  const activeCount = products.filter(
    (product) => product.status === "active",
  ).length;

  const inactiveCount = products.filter(
    (product) => product.status === "inactive",
  ).length;

  const totalValue = products.reduce(
    (sum, product) =>
      sum + Number(product.price || 0),
    0,
  );

  return (
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <div className="header-kicker">
              منصة دزوان
            </div>
            <div className="header-title">
              إدارة المنتجات
            </div>
          </div>
        </header>

        <div className="admin-content">
          <div className="dashboard">
            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  قوائم المنشآت
                </span>

                <h1>المنتجات</h1>

                <p>
                  إدارة المنتجات والأسعار لكل مطعم أو محل.
                </p>
              </div>

              <div className="captains-intro-icon">
                <Package size={24} />
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>إجمالي المنتجات</span>
                <strong>{products.length}</strong>
              </div>

              <div className="location-summary-card">
                <span>نشطة</span>
                <strong>{activeCount}</strong>
              </div>

              <div className="location-summary-card">
                <span>غير نشطة</span>
                <strong>{inactiveCount}</strong>
              </div>

              <div className="location-summary-card">
                <span>مجموع الأسعار</span>
                <strong>
                  {totalValue.toFixed(2)} ج.م
                </strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div className="panel-header">
                <div>
                  <h2>قائمة المنتجات</h2>
                  <p>
                    اختر المنشأة ثم أدر منتجاتها.
                  </p>
                </div>

                <div className="establishment-filters">
                  <select
                    value={selectedEstablishment}
                    onChange={(e) =>
                      setSelectedEstablishment(
                        e.target.value,
                      )
                    }
                  >
                    {establishments.length === 0 && (
                      <option value="">
                        لا توجد منشآت
                      </option>
                    )}

                    {establishments.map(
                      (establishment) => (
                        <option
                          key={establishment._id}
                          value={establishment._id}
                        >
                          {establishment.name}
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as
                          | "all"
                          | ProductStatus,
                      )
                    }
                  >
                    <option value="all">
                      كل الحالات
                    </option>
                    <option value="active">
                      نشط
                    </option>
                    <option value="inactive">
                      غير نشط
                    </option>
                  </select>

                  <button
                    type="button"
                    className="captain-action approve"
                    disabled={
                      !selectedEstablishment ||
                      establishments.find(
                        (item) =>
                          item._id ===
                          selectedEstablishment,
                      )?.status !== "active"
                    }
                    onClick={openCreate}
                  >
                    <Plus size={16} />
                    إضافة منتج
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="locations-loading">
                  <Loader2
                    size={27}
                    className="location-spin"
                  />
                  <span>
                    جارٍ تحميل المنتجات...
                  </span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <Package size={25} />
                  </div>

                  <h3>لا توجد منتجات</h3>

                  <p>
                    لا توجد منتجات للمنشأة المختارة.
                  </p>
                </div>
              ) : (
                <div className="establishments-list">
                  {filteredProducts.map(
                    (product) => {
                      const open =
                        openId === product._id;

                      return (
                        <div
                          className="establishment-item"
                          key={product._id}
                        >
                          <div className="establishment-row">
                            <button
                              type="button"
                              className="governorate-expand"
                              onClick={() =>
                                setOpenId(
                                  open
                                    ? null
                                    : product._id,
                                )
                              }
                            >
                              {open ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown
                                  size={18}
                                />
                              )}
                            </button>

                            <div className="establishment-icon">
                              {product.imageUrl ? (
                                <img
                                  src={
                                    product.imageUrl
                                  }
                                  alt=""
                                />
                              ) : (
                                <Package size={18} />
                              )}
                            </div>

                            <div className="establishment-info">
                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                {product.price.toFixed(2)}{" "}
                                ج.م
                              </span>
                            </div>

                            <span
                              className={`establishment-status ${product.status}`}
                            >
                              {statusLabels(product.status)}
                            </span>

                            <span className="establishment-governorate">
                              {formatDate(
                                product.createdAt,
                              )}
                            </span>

                            <button
                              type="button"
                              className="location-icon-button"
                              title="تعديل"
                              onClick={() =>
                                openEdit(product)
                              }
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              className="location-icon-button danger"
                              title="حذف"
                              disabled={saving}
                              onClick={() =>
                                void deleteProduct(
                                  product,
                                )
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {open && (
                            <div className="establishment-details">
                              <div className="establishment-details-grid">
                                <div>
                                  <span>
                                    اسم المنتج
                                  </span>
                                  <strong>
                                    {product.name}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    السعر
                                  </span>
                                  <strong>
                                    {product.price.toFixed(
                                      2,
                                    )}{" "}
                                    ج.م
                                  </strong>
                                </div>

                                <div>
                                  <span>الحالة</span>
                                  <strong>
                                    {statusLabels(
                                      product.status,
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    تاريخ الإنشاء
                                  </span>
                                  <strong>
                                    {formatDate(
                                      product.createdAt,
                                    )}
                                  </strong>
                                </div>
                              </div>

                              {product.description && (
                                <div className="establishment-description">
                                  <span>الوصف</span>
                                  <p>
                                    {product.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {modal && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>
                  {modal === "create"
                    ? "إضافة منتج"
                    : "تعديل المنتج"}
                </span>

                <h2>
                  {modal === "create"
                    ? "منتج جديد"
                    : editProduct?.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  resetForm();
                }}
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label>
                اسم المنتج
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />
              </label>

              <label>
                السعر
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                />
              </label>

              <label>
                الحالة
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as ProductStatus,
                    )
                  }
                >
                  <option value="active">
                    نشط
                  </option>
                  <option value="inactive">
                    غير نشط
                  </option>
                </select>
              </label>

              <label>
                المنشأة
                <select
                  value={selectedEstablishment}
                  disabled
                  onChange={() => undefined}
                >
                  {establishments.map(
                    (establishment) => (
                      <option
                        key={establishment._id}
                        value={establishment._id}
                      >
                        {establishment.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="full-width-field">
                الوصف
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value,
                    )
                  }
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  resetForm();
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveProduct()
                }
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="location-spin"
                  />
                ) : (
                  <Package size={16} />
                )}

                {modal === "create"
                  ? "إضافة"
                  : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabels(
  status: ProductStatus,
): string {
  return status === "active"
    ? "نشط"
    : "غير نشط";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}
