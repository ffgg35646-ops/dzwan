import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";

type Option = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  type?: string;
  areas?: Array<{
    _id?: string;
    id?: string;
    name?: string;
  }>;
};

type ReportOrder = {
  _id: string;
  orderNumber?: string;
  status?: string;
  createdAt?: string;
  total?: number;
  subtotal?: number;
  deliveryFee?: number;
  captainId?: string | { _id?: string; fullName?: string };
  establishmentId?: string | { _id?: string; name?: string; type?: string };
};

type Report = {
  totalOrders: number;
  completed: number;
  cancelled: number;
  active: number;
  statistics: {
    daily: Array<any>;
    weekly: Array<any>;
    monthly: Array<any>;
  };
  orders: ReportOrder[];
};

function arr(data: any, key?: string): Option[] {
  const value = key ? data?.[key] : data;
  return Array.isArray(value)
    ? value
    : Array.isArray(data?.items)
      ? data.items
      : [];
}

function unwrapReport(data: any): Report {
  return (
    data?.report ??
    data?.data?.report ??
    data?.data ??
    data
  );
}

function idOf(value: any) {
  return String(
    value?._id ??
      value?.id ??
      value ??
      "",
  );
}

function nameOf(value: any) {
  return String(
    value?.name ??
      value?.fullName ??
      "—",
  );
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  preparing: "جاري التحضير",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تم تعيين المندوب",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

export default function Reports() {
  const [report, setReport] = useState<Report | null>(null);

  const [locations, setLocations] = useState<Option[]>([]);
  const [establishments, setEstablishments] = useState<Option[]>([]);
  const [captains, setCaptains] = useState<Option[]>([]);

  const [governorateId, setGovernorateId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [captainId, setCaptainId] = useState("");
  const [status, setStatus] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const areas = useMemo(() => {
    const governorate = locations.find(
      (item) => idOf(item) === governorateId,
    );

    return governorate?.areas ?? [];
  }, [locations, governorateId]);

  const establishmentOptions = useMemo(() => {
    return establishments.filter((item) => {
      if (!establishmentType) {
        return true;
      }

      return String(item.type ?? "") === establishmentType;
    });
  }, [establishments, establishmentType]);

  const establishmentMap = useMemo(() => {
    return new Map(
      establishments.map((item) => [
        idOf(item),
        nameOf(item),
      ]),
    );
  }, [establishments]);

  const captainMap = useMemo(() => {
    return new Map(
      captains.map((item) => [
        idOf(item),
        nameOf(item),
      ]),
    );
  }, [captains]);

  async function loadOptions() {
    const [locationsResponse, establishmentsResponse, captainsResponse] =
      await Promise.all([
        api.get("/locations").catch(() => ({ data: [] })),
        api.get("/establishments").catch(() => ({ data: [] })),
        api.get("/captains").catch(() => ({ data: [] })),
      ]);

    setLocations(
      arr(locationsResponse.data, "locations"),
    );

    setEstablishments(
      arr(establishmentsResponse.data, "establishments"),
    );

    setCaptains(
      arr(captainsResponse.data, "captains"),
    );
  }

  async function loadReport() {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (governorateId) {
        params.governorateId = governorateId;
      }

      if (areaId) {
        params.areaId = areaId;
      }

      if (establishmentId) {
        params.establishmentId = establishmentId;
      }

      if (establishmentType) {
        params.establishmentType =
          establishmentType;
      }

      if (captainId) {
        params.captainId = captainId;
      }

      if (status) {
        params.status = status;
      }

      if (start) {
        params.start = new Date(
          `${start}T00:00:00.000Z`,
        ).toISOString();
      }

      if (end) {
        params.end = new Date(
          `${end}T23:59:59.999Z`,
        ).toISOString();
      }

      const response = await api.get(
        "/requirements/reports/admin",
        { params },
      );

      setReport(
        unwrapReport(response.data),
      );
    } catch (err) {
      setReport(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    try {
      setLoading(true);
      setError("");
      await loadOptions();
      await loadReport();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const revenue = useMemo(() => {
    const orders = report?.orders ?? [];

    return {
      gross: orders.reduce(
        (sum, item) =>
          sum + Number(item.total ?? 0),
        0,
      ),
      delivery: orders.reduce(
        (sum, item) =>
          sum + Number(item.deliveryFee ?? 0),
        0,
      ),
    };
  }, [report]);

  const orderRows = report?.orders ?? [];

  if (loading && !report) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={22} />
        جاري تحميل تقارير الإدارة...
      </div>
    );
  }

  return (
    <div className="page">
      <HomeBackButton />

      <div className="page-header">
        <div>
          <Link
            to="/dashboard"
            className="back-link"
          >
            <ArrowRight size={18} />
            العودة إلى لوحة التحكم
          </Link>

          <h1>تقارير الإدارة</h1>

          <p>
            تقارير الطلبات مع البحث والفلترة حسب
            المحافظة والمنطقة والمنشأة والكابتن والتاريخ
            والحالة.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReport}
          className="secondary-button"
        >
          <RefreshCw size={17} />
          تحديث
        </button>
      </div>

      <section className="details-card reports-filters-card">
        <div className="reports-filters-heading">
          <div>
            <h2>البحث والفلترة</h2>
            <p>حدد المعايير المطلوبة ثم طبّق الفلاتر لعرض التقرير المناسب.</p>
          </div>
        </div>

        <div className="filters-grid">
          <label>
            <span>المحافظة</span>
            <select
              value={governorateId}
              onChange={(event) => {
                setGovernorateId(event.target.value);
                setAreaId("");
              }}
            >
              <option value="">كل المحافظات</option>
              {locations.map((item) => (
                <option
                  key={idOf(item)}
                  value={idOf(item)}
                >
                  {nameOf(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>المنطقة</span>
            <select
              value={areaId}
              onChange={(event) =>
                setAreaId(event.target.value)
              }
              disabled={!governorateId}
            >
              <option value="">كل المناطق</option>
              {areas.map((item) => (
                <option
                  key={idOf(item)}
                  value={idOf(item)}
                >
                  {nameOf(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>نوع المنشأة</span>
            <select
              value={establishmentType}
              onChange={(event) => {
                setEstablishmentType(
                  event.target.value,
                );
                setEstablishmentId("");
              }}
            >
              <option value="">الكل</option>
              <option value="restaurant">
                المطاعم
              </option>
              <option value="shop">
                المحلات
              </option>
            </select>
          </label>

          <label>
            <span>المحل / المطعم</span>
            <select
              value={establishmentId}
              onChange={(event) =>
                setEstablishmentId(
                  event.target.value,
                )
              }
            >
              <option value="">
                كل المنشآت
              </option>

              {establishmentOptions.map((item) => (
                <option
                  key={idOf(item)}
                  value={idOf(item)}
                >
                  {nameOf(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>الكابتن</span>
            <select
              value={captainId}
              onChange={(event) =>
                setCaptainId(event.target.value)
              }
            >
              <option value="">
                كل الكباتن
              </option>

              {captains.map((item) => (
                <option
                  key={idOf(item)}
                  value={idOf(item)}
                >
                  {nameOf(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>حالة الطلب</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              <option value="">
                كل الحالات
              </option>

              {Object.entries(statusLabels).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>من تاريخ</span>
            <input
              type="date"
              value={start}
              onChange={(event) =>
                setStart(event.target.value)
              }
            />
          </label>

          <label>
            <span>إلى تاريخ</span>
            <input
              type="date"
              value={end}
              onChange={(event) =>
                setEnd(event.target.value)
              }
            />
          </label>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="primary-button"
            onClick={loadReport}
          >
            تطبيق الفلاتر
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setGovernorateId("");
              setAreaId("");
              setEstablishmentId("");
              setEstablishmentType("");
              setCaptainId("");
              setStatus("");
              setStart("");
              setEnd("");

              setTimeout(() => {
                loadReport();
              }, 0);
            }}
          >
            مسح الفلاتر
          </button>
        </div>
      </section>

      {error ? (
        <section className="details-card">
          <p>{error}</p>
        </section>
      ) : null}

      {report ? (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <div className="reports-stat-icon">
                <BarChart3 size={20} />
              </div>
              <div className="reports-stat-content">
                <span>إجمالي الطلبات</span>
                <strong>
                  {report.totalOrders}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="reports-stat-icon">
                <BarChart3 size={20} />
              </div>
              <div className="reports-stat-content">
                <span>المكتملة</span>
                <strong>
                  {report.completed}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="reports-stat-icon">
                <BarChart3 size={20} />
              </div>
              <div className="reports-stat-content">
                <span>الملغاة</span>
                <strong>
                  {report.cancelled}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="reports-stat-icon">
                <BarChart3 size={20} />
              </div>
              <div className="reports-stat-content">
                <span>النشطة</span>
                <strong>
                  {report.active}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="reports-stat-icon">
                <BarChart3 size={20} />
              </div>
              <div className="reports-stat-content">
                <span>قيمة الطلبات</span>
                <strong>
                  {revenue.gross.toLocaleString("ar-IQ")}
                  {" "}
                  د.ع
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="reports-stat-icon">
                <BarChart3 size={20} />
              </div>
              <div className="reports-stat-content">
                <span>أجور التوصيل</span>
                <strong>
                  {revenue.delivery.toLocaleString("ar-IQ")}
                  {" "}
                  د.ع
                </strong>
              </div>
            </div>
          </section>

          <StatisticsSection
            title="الإحصائيات اليومية"
            rows={report.statistics?.daily ?? []}
          />

          <StatisticsSection
            title="الإحصائيات الأسبوعية"
            rows={report.statistics?.weekly ?? []}
          />

          <StatisticsSection
            title="الإحصائيات الشهرية"
            rows={report.statistics?.monthly ?? []}
          />

          <section className="details-card">
            <div className="section-title-row">
              <h2>تفاصيل الطلبات</h2>
              <span>
                {orderRows.length} طلب
              </span>
            </div>

            {orderRows.length === 0 ? (
              <p>لا توجد طلبات لهذه الفلاتر.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>التاريخ</th>
                      <th>الوقت</th>
                      <th>الحالة</th>
                      <th>المنشأة</th>
                      <th>الكابتن</th>
                      <th>قيمة الطلب</th>
                      <th>أجرة التوصيل</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orderRows.map((order) => {
                      const captainIdValue =
                        idOf(order.captainId);

                      const establishmentIdValue =
                        idOf(
                          order.establishmentId,
                        );

                      const establishmentName =
                        typeof order.establishmentId ===
                        "object"
                          ? order.establishmentId
                              ?.name
                          : establishmentMap.get(
                              establishmentIdValue,
                            );

                      const captainName =
                        typeof order.captainId ===
                        "object"
                          ? order.captainId
                              ?.fullName
                          : captainMap.get(
                              captainIdValue,
                            );

                      return (
                        <tr key={order._id}>
                          <td>
                            {order.orderNumber ||
                              order._id}
                          </td>

                          <td>
                            {order.createdAt
                              ? new Date(
                                  order.createdAt,
                                ).toLocaleDateString(
                                  "ar-IQ",
                                )
                              : "—"}
                          </td>

                          <td>
                            {order.createdAt
                              ? new Date(
                                  order.createdAt,
                                ).toLocaleTimeString(
                                  "ar-IQ",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </td>

                          <td>
                            {statusLabels[
                              order.status || ""
                            ] ||
                              order.status ||
                              "—"}
                          </td>

                          <td>
                            {establishmentName ||
                              "—"}
                          </td>

                          <td>
                            {captainName ||
                              "لم يتم التعيين"}
                          </td>

                          <td>
                            {Number(
                              order.total ?? 0,
                            ).toLocaleString(
                              "ar-IQ",
                            )}{" "}
                            د.ع
                          </td>

                          <td>
                            {Number(
                              order.deliveryFee ??
                                0,
                            ).toLocaleString(
                              "ar-IQ",
                            )}{" "}
                            د.ع
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatisticsSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    period: string;
    totalOrders: number;
    completed: number;
    cancelled: number;
    active: number;
  }>;
}) {
  return (
    <section className="details-card">
      <h2>{title}</h2>

      {rows.length === 0 ? (
        <p>لا توجد بيانات.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>الفترة</th>
                <th>إجمالي الطلبات</th>
                <th>المكتملة</th>
                <th>الملغاة</th>
                <th>النشطة</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{row.totalOrders}</td>
                  <td>{row.completed}</td>
                  <td>{row.cancelled}</td>
                  <td>{row.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
