import { useEffect } from "react";
import React, { useMemo, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import {
  changePassword,
  requestEmailChange,
  verifyEmailChange,
} from "../../api/profile";
import {
  getMyCaptainRatings,
} from "../../api/captainRatingRuntime";

const AVATARS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  foreground: string;
}> = [
  { icon: "bicycle", background: "#E0F2FE", foreground: "#0369A1" },
  { icon: "flash", background: "#FEF3C7", foreground: "#B45309" },
  { icon: "navigate", background: "#DCFCE7", foreground: "#15803D" },
  { icon: "rocket", background: "#EDE9FE", foreground: "#6D28D9" },
  { icon: "shield-checkmark", background: "#FCE7F3", foreground: "#BE185D" },
  { icon: "speedometer", background: "#F3E8FF", foreground: "#7E22CE" },
  { icon: "star", background: "#FFEDD5", foreground: "#C2410C" },
  { icon: "car-sport", background: "#CCFBF1", foreground: "#0F766E" },
  { icon: "map", background: "#DBEAFE", foreground: "#1D4ED8" },
  { icon: "sparkles", background: "#F1F5F9", foreground: "#334155" },
];

function getAvatarIndex(seed: string) {
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return hash % AVATARS.length;
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function CaptainProfileScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailStep, setEmailStep] = useState<"email" | "otp">("email");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const isFocused = useIsFocused();

  const [ratingModalVisible, setRatingModalVisible] =
    useState(false);

  const [ratingLoading, setRatingLoading] =
    useState(false);

  const [ratingPage, setRatingPage] =
    useState(1);

  const [ratingData, setRatingData] =
    useState<{
      total: number;
      average: number;
      page: number;
      limit: number;
      totalPages: number;
      ratings: Array<{
        _id: string;
        stars: number;
        comment?: string | null;
        createdAt?: string | null;
        orderId?: string | null;
        orderNumber?: string | null;
        restaurantName?: string | null;
      }>;
    } | null>(null);

  const avatar = useMemo(() => {
    const seed =
      user?.id ||
      user?.phone ||
      user?.email ||
      user?.name ||
      "captain";

    return AVATARS[getAvatarIndex(seed)];
  }, [user]);

  if (!user) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Ionicons
            name="person-circle-outline"
            size={52}
            color={appTheme.primaryColor}
          />
          <Text style={styles.emptyTitle}>
            بيانات الحساب غير متوفرة
          </Text>
          <Text style={styles.emptyText}>
            أعد تسجيل الدخول ثم افتح صفحة حسابي مرة أخرى.
          </Text>
        </View>
      </Screen>
    );
  }

  const name = user.name || "الكابتن";
  const phone = user.phone || "—";
  const email = user.email || "غير مضاف";
  const governorate = user.governorateName || "—";
  const area = user.areaName || "—";

  const loadRatings = async (
    page = 1,
    silent = false,
  ) => {
    try {
      if (!silent) {
        setRatingLoading(true);
      }

      const response: any =
        await getMyCaptainRatings(page, 4);

      const data =
        response?.data ||
        response ||
        {};

      setRatingData({
        total: Number(data.total || 0),
        average: Number(data.average || 0),
        page: Number(data.page || page),
        limit: Number(data.limit || 4),
        totalPages: Number(
          data.totalPages || 1,
        ),
        ratings: Array.isArray(data.ratings)
          ? data.ratings
          : [],
      });

      setRatingPage(
        Number(data.page || page),
      );
    } catch {
      if (!silent) {
        Alert.alert(
          "التقييمات",
          "تعذر تحميل تقييمات الكابتن حاليًا.",
        );
      }
    } finally {
      if (!silent) {
        setRatingLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isFocused || !user?.id) return;

    void loadRatings(1, true);

    const timer = setInterval(() => {
      void loadRatings(
        ratingModalVisible ? ratingPage : 1,
        true,
      );
    }, 15000);

    return () => clearInterval(timer);
  }, [
    isFocused,
    user?.id,
    ratingModalVisible,
    ratingPage,
  ]);

  function openRatings() {
    setRatingModalVisible(true);
    void loadRatings(1);
  }

  function closeRatings() {
    if (!ratingLoading) {
      setRatingModalVisible(false);
      setRatingPage(1);
    }
  }

  async function sendEmailOtp() {
    const emailValue = newEmail.trim().toLowerCase();

    if (!emailValue || !/^\S+@\S+\.\S+$/.test(emailValue)) {
      Alert.alert(
        "البريد الإلكتروني",
        "أدخل بريدًا إلكترونيًا صحيحًا.",
      );
      return;
    }

    try {
      setEmailBusy(true);

      const result: any =
        await requestEmailChange(emailValue);

      const id =
        result?.verificationId ||
        result?.data?.verificationId;

      if (!id) {
        throw new Error(
          "لم يصل معرّف التحقق من الخادم.",
        );
      }

      setVerificationId(String(id));
      setEmailStep("otp");

      Alert.alert(
        "تم إرسال الكود",
        "تم إرسال كود التحقق إلى البريد الإلكتروني الجديد.",
      );
    } catch (error) {
      Alert.alert(
        "تعذر الإرسال",
        getErrorMessage(
          error,
          "تعذر إرسال كود التحقق.",
        ),
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailOtp() {
    const otp = emailOtp.trim();

    if (!verificationId || !otp) {
      Alert.alert(
        "كود التحقق",
        "أدخل كود التحقق.",
      );
      return;
    }

    try {
      setEmailBusy(true);

      await verifyEmailChange(
        verificationId,
        otp,
      );

      const currentUser = user;

      if (!currentUser) {
        throw new Error("بيانات الحساب غير متوفرة.");
      }

      setUser({
        id: currentUser.id,
        role: currentUser.role,
        name: currentUser.name,
        phone: currentUser.phone,
        email: newEmail.trim().toLowerCase(),
        status: currentUser.status,
        governorateId:
          currentUser.governorateId ?? null,
        governorateName:
          currentUser.governorateName ?? null,
        areaId: currentUser.areaId ?? null,
        areaName:
          currentUser.areaName ?? null,
        avatarUrl:
          currentUser.avatarUrl ?? null,
      });

      setEmailModalVisible(false);
      setEmailStep("email");
      setNewEmail("");
      setEmailOtp("");
      setVerificationId("");

      Alert.alert(
        "تم بنجاح",
        "تم تغيير البريد الإلكتروني بنجاح.",
      );
    } catch (error) {
      Alert.alert(
        "تعذر التأكيد",
        getErrorMessage(
          error,
          "كود التحقق غير صحيح.",
        ),
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function saveNewPassword() {
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      Alert.alert(
        "كلمة المرور",
        "املأ جميع الخانات.",
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "كلمة المرور",
        "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "كلمة المرور",
        "تأكيد كلمة المرور غير مطابق.",
      );
      return;
    }

    try {
      setPasswordBusy(true);

      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert(
        "تم بنجاح",
        "تم تغيير كلمة المرور بنجاح.",
      );
    } catch (error) {
      Alert.alert(
        "تعذر تغيير كلمة المرور",
        getErrorMessage(
          error,
          "تعذر تغيير كلمة المرور.",
        ),
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <Ionicons
              name="person-outline"
              size={21}
              color={appTheme.primaryColor}
            />
          </View>

          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>
              زاجل ديلفري
            </Text>

            <Text style={styles.title}>
              حسابي
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  avatar.background,
              },
            ]}
          >
            <Ionicons
              name={avatar.icon}
              size={40}
              color={avatar.foreground}
            />
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>
              {name}
            </Text>

            <View style={styles.badge}>
              <Ionicons
                name="bicycle-outline"
                size={14}
                color="#CCFBF1"
              />

              <Text style={styles.badgeText}>
                كابتن توصيل
              </Text>
            </View>
          </View>
        </View>

        <SectionTitle
          icon="person-circle-outline"
          title="بيانات الكابتن"
          styles={styles}
        />

        <View style={styles.card}>
          <InfoRow
            icon="person-outline"
            label="الاسم"
            value={name}
            styles={styles}
          />

          <InfoRow
            icon="call-outline"
            label="رقم الهاتف"
            value={phone}
            styles={styles}
          />

          <InfoRow
            icon="location-outline"
            label="المحافظة"
            value={governorate}
            styles={styles}
          />

          <InfoRow
            icon="map-outline"
            label="المنطقة"
            value={area}
            styles={styles}
            last
          />
        </View>

        <SectionTitle
          icon="star-outline"
          title="تقييم الكابتن"
          styles={styles}
        />

        <View style={styles.ratingCard}>
          <View style={styles.ratingTop}>
            <View style={styles.ratingScoreBox}>
              <Ionicons
                name="star"
                size={24}
                color="#F59E0B"
              />

              <Text style={styles.ratingAverage}>
                {Number(
                  ratingData?.average || 0,
                ).toFixed(1)}
              </Text>

              <Text style={styles.ratingAverageLabel}>
                متوسط التقييم
              </Text>
            </View>

            <View style={styles.ratingSummary}>
              <Text style={styles.ratingTotal}>
                {Number(
                  ratingData?.total || 0,
                ).toLocaleString("ar-IQ")}
              </Text>

              <Text style={styles.ratingTotalLabel}>
                تقييم
              </Text>

              <Text style={styles.ratingHint}>
                تقييمات المطاعم والمحلات
              </Text>
            </View>
          </View>

          <Pressable
            onPress={openRatings}
            style={({ pressed }) => [
              styles.ratingDetailsButton,
              pressed && { opacity: 0.78 },
            ]}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.ratingDetailsButtonText}>
              عرض تفاصيل التقييمات
            </Text>

            <Ionicons
              name="chevron-back-outline"
              size={17}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <SectionTitle
          icon="shield-checkmark-outline"
          title="أمان الحساب"
          styles={styles}
        />

        <View style={styles.card}>
          <ActionRow
            icon="mail-outline"
            label="البريد الإلكتروني"
            value={email}
            action="تغيير"
            onPress={() => {
              setNewEmail("");
              setEmailOtp("");
              setVerificationId("");
              setEmailStep("email");
              setEmailModalVisible(true);
            }}
            styles={styles}
          />

          <ActionRow
            icon="lock-closed-outline"
            label="كلمة المرور"
            value="••••••••"
            action="تغيير"
            onPress={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordModalVisible(true);
            }}
            styles={styles}
            last
          />
        </View>

        <View style={styles.infoNotice}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={appTheme.primaryColor}
          />

          <Text style={styles.infoNoticeText}>
            الاسم والهاتف والمحافظة والمنطقة بيانات الحساب المسجلة، ويمكن تغيير البريد الإلكتروني أو كلمة المرور فقط.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRatings}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              styles.ratingModalCard,
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="star-outline"
                  size={21}
                  color={appTheme.primaryColor}
                />
              </View>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  تفاصيل التقييمات
                </Text>

                <Text style={styles.modalSubtitle}>
                  {Number(
                    ratingData?.total || 0,
                  ).toLocaleString("ar-IQ")}{" "}
                  تقييم · متوسط{" "}
                  {Number(
                    ratingData?.average || 0,
                  ).toFixed(1)}
                </Text>
              </View>

              <Pressable
                onPress={closeRatings}
                disabled={ratingLoading}
                style={styles.modalCloseButton}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={appTheme.secondaryTextColor}
                />
              </Pressable>
            </View>

            {ratingLoading && !ratingData ? (
              <View style={styles.ratingModalLoading}>
                <Text style={styles.ratingModalLoadingText}>
                  جاري تحميل التقييمات...
                </Text>
              </View>
            ) : !ratingData?.ratings?.length ? (
              <View style={styles.ratingEmpty}>
                <View style={styles.ratingEmptyIcon}>
                  <Ionicons
                    name="star-outline"
                    size={30}
                    color="#F59E0B"
                  />
                </View>

                <Text style={styles.ratingEmptyTitle}>
                  لا توجد تقييمات حتى الآن
                </Text>

                <Text style={styles.ratingEmptyText}>
                  ستظهر تقييمات المطاعم والمحلات هنا بعد تقييم طلباتك المكتملة.
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={
                    styles.ratingGrid
                  }
                  style={styles.ratingModalScroll}
                >
                  {ratingData.ratings.map(
                    (rating) => (
                      <View
                        key={rating._id}
                        style={styles.ratingItemCard}
                      >
                        <View style={styles.ratingItemTop}>
                          <View style={styles.ratingStars}>
                            {[1, 2, 3, 4, 5].map(
                              (star) => (
                                <Ionicons
                                  key={star}
                                  name={
                                    star <=
                                    Number(
                                      rating.stars || 0,
                                    )
                                      ? "star"
                                      : "star-outline"
                                  }
                                  size={15}
                                  color="#F59E0B"
                                />
                              ),
                            )}
                          </View>

                          <Text
                            style={styles.ratingItemDate}
                          >
                            {rating.createdAt
                              ? new Date(
                                  rating.createdAt,
                                ).toLocaleDateString(
                                  "ar-IQ",
                                )
                              : "—"}
                          </Text>
                        </View>

                        <View
                          style={styles.ratingMetaRow}
                        >
                          <Text
                            style={styles.ratingMetaLabel}
                          >
                            رقم الطلب
                          </Text>

                          <Text
                            style={styles.ratingMetaValue}
                          >
                            #
                            {rating.orderNumber ||
                              "—"}
                          </Text>
                        </View>

                        <View
                          style={styles.ratingMetaRow}
                        >
                          <Text
                            style={styles.ratingMetaLabel}
                          >
                            المطعم / المحل
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={styles.ratingMetaValue}
                          >
                            {rating.restaurantName ||
                              "—"}
                          </Text>
                        </View>

                        <View
                          style={styles.ratingCommentBox}
                        >
                          <Text
                            style={styles.ratingCommentLabel}
                          >
                            التعليق
                          </Text>

                          <Text
                            numberOfLines={4}
                            style={styles.ratingComment}
                          >
                            {rating.comment?.trim() ||
                              "بدون تعليق"}
                          </Text>
                        </View>
                      </View>
                    ),
                  )}
                </ScrollView>

                {ratingData.totalPages > 1 ? (
                  <View style={styles.ratingPagination}>
                    <Pressable
                      disabled={
                        ratingPage <= 1 ||
                        ratingLoading
                      }
                      onPress={() =>
                        void loadRatings(
                          Math.max(
                            1,
                            ratingPage - 1,
                          ),
                        )
                      }
                      style={[
                        styles.ratingPageArrow,
                        (ratingPage <= 1 ||
                          ratingLoading) &&
                          styles.ratingPageDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={
                          ratingPage <= 1
                            ? "#B9B9B9"
                            : appTheme.primaryColor
                        }
                      />
                    </Pressable>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.ratingPageNumbers
                      }
                    >
                      {Array.from(
                        {
                          length:
                            ratingData.totalPages,
                        },
                        (_, index) =>
                          index + 1,
                      ).map((page) => (
                        <Pressable
                          key={page}
                          disabled={
                            ratingLoading
                          }
                          onPress={() =>
                            void loadRatings(
                              page,
                            )
                          }
                          style={[
                            styles.ratingPageButton,
                            page ===
                              ratingPage &&
                              styles.ratingPageButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.ratingPageText,
                              page ===
                                ratingPage &&
                                styles.ratingPageTextActive,
                            ]}
                          >
                            {page}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Pressable
                      disabled={
                        ratingPage >=
                          ratingData.totalPages ||
                        ratingLoading
                      }
                      onPress={() =>
                        void loadRatings(
                          Math.min(
                            ratingData.totalPages,
                            ratingPage + 1,
                          ),
                        )
                      }
                      style={[
                        styles.ratingPageArrow,
                        (ratingPage >=
                          ratingData.totalPages ||
                          ratingLoading) &&
                          styles.ratingPageDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={
                          ratingPage >=
                          ratingData.totalPages
                            ? "#B9B9B9"
                            : appTheme.primaryColor
                        }
                      />
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!emailBusy) {
            setEmailModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="mail-outline"
                  size={21}
                  color={appTheme.primaryColor}
                />
              </View>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  تغيير البريد الإلكتروني
                </Text>

                <Text style={styles.modalSubtitle}>
                  {emailStep === "email"
                    ? "أدخل البريد الإلكتروني الجديد"
                    : "أدخل كود التحقق المرسل إلى البريد الجديد"}
                </Text>
              </View>
            </View>

            {emailStep === "email" ? (
              <>
                <Field
                  label="البريد الإلكتروني الجديد"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="example@gmail.com"
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  disabled={emailBusy}
                  styles={styles}
                />

                <PrimaryButton
                  title={
                    emailBusy
                      ? "جاري الإرسال..."
                      : "إرسال كود التحقق"
                  }
                  icon="send-outline"
                  onPress={sendEmailOtp}
                  disabled={emailBusy}
                  styles={styles}
                />
              </>
            ) : (
              <>
                <View style={styles.otpBox}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={appTheme.primaryColor}
                  />

                  <Text style={styles.otpText}>
                    تم إرسال الكود إلى:
                    {"\n"}
                    {newEmail}
                  </Text>
                </View>

                <Field
                  label="كود التحقق"
                  value={emailOtp}
                  onChangeText={(value) =>
                    setEmailOtp(
                      value.replace(/\D/g, ""),
                    )
                  }
                  placeholder="000000"
                  icon="keypad-outline"
                  keyboardType="number-pad"
                  maxLength={6}
                  disabled={emailBusy}
                  styles={styles}
                />

                <PrimaryButton
                  title={
                    emailBusy
                      ? "جاري التأكيد..."
                      : "تأكيد تغيير البريد"
                  }
                  icon="checkmark-circle-outline"
                  onPress={confirmEmailOtp}
                  disabled={emailBusy}
                  styles={styles}
                />

                <Pressable
                  onPress={sendEmailOtp}
                  disabled={emailBusy}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkButtonText}>
                    إعادة إرسال الكود
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable
              onPress={() => {
                if (!emailBusy) {
                  setEmailModalVisible(false);
                }
              }}
              disabled={emailBusy}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                إلغاء
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!passwordBusy) {
            setPasswordModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color={appTheme.primaryColor}
                />
              </View>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  تغيير كلمة المرور
                </Text>

                <Text style={styles.modalSubtitle}>
                  أدخل كلمة المرور الحالية ثم الجديدة
                </Text>
              </View>
            </View>

            <Field
              label="كلمة المرور الحالية"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="كلمة المرور الحالية"
              icon="lock-closed-outline"
              secureTextEntry
              disabled={passwordBusy}
              styles={styles}
            />

            <Field
              label="كلمة المرور الجديدة"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="6 أحرف على الأقل"
              icon="key-outline"
              secureTextEntry
              disabled={passwordBusy}
              styles={styles}
            />

            <Field
              label="تأكيد كلمة المرور الجديدة"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="أعد كتابة كلمة المرور"
              icon="checkmark-done-outline"
              secureTextEntry
              disabled={passwordBusy}
              styles={styles}
            />

            <PrimaryButton
              title={
                passwordBusy
                  ? "جاري الحفظ..."
                  : "حفظ كلمة المرور"
              }
              icon="checkmark-circle-outline"
              onPress={saveNewPassword}
              disabled={passwordBusy}
              styles={styles}
            />

            <Pressable
              onPress={() => {
                if (!passwordBusy) {
                  setPasswordModalVisible(false);
                }
              }}
              disabled={passwordBusy}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                إلغاء
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SectionTitle({
  icon,
  title,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={styles.primaryIcon.color as string}
        />
      </View>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  styles,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.rowBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={styles.primaryIcon.color as string}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>
          {label}
        </Text>

        <Text style={styles.rowValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  value,
  action,
  onPress,
  styles,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  action: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.rowBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={styles.primaryIcon.color as string}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>
          {label}
        </Text>

        <Text style={styles.rowValue}>
          {value}
        </Text>
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.changeButton,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={styles.changeButtonText}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  styles,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  maxLength,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  styles: ReturnType<typeof createStyles>;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View style={styles.inputWrap}>
        <View style={styles.inputIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={styles.primaryIcon.color as string}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          maxLength={maxLength}
          style={styles.input}
          textAlign="right"
        />
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  icon,
  onPress,
  disabled,
  styles,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && { opacity: 0.78 },
        disabled && { opacity: 0.55 },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color="#FFFFFF"
      />

      <Text style={styles.primaryButtonText}>
        {title}
      </Text>
    </Pressable>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 2,
      paddingBottom: 26,
    },

    heading: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },

    headingIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "12",
    },

    headingText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 11,
      fontWeight: "900",
    },

    title: {
      marginTop: 2,
      color: appTheme.textColor,
      fontSize: 28,
      fontWeight: "900",
      textAlign: "right",
    },

    hero: {
      marginTop: 18,
      padding: 20,
      borderRadius: 24,
      backgroundColor:
        appTheme.primaryDarkColor,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 15,
    },

    avatar: {
      width: 78,
      height: 78,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: "rgba(255,255,255,.16)",
    },

    heroInfo: {
      flex: 1,
      alignItems: "flex-end",
    },

    heroName: {
      color: "#FFFFFF",
      fontSize: 23,
      fontWeight: "900",
      textAlign: "right",
    },

    badge: {
      marginTop: 9,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor:
        "rgba(255,255,255,.12)",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
    },

    badgeText: {
      color: "#CCFBF1",
      fontSize: 11,
      fontWeight: "800",
    },

    sectionTitleRow: {
      marginTop: 22,
      marginBottom: 10,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },

    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "12",
    },

    primaryIcon: {
      color: appTheme.primaryColor,
    },

    sectionTitle: {
      flex: 1,
      color: appTheme.textColor,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "right",
    },

    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
      paddingHorizontal: 14,
      overflow: "hidden",
    },

    infoRow: {
      minHeight: 76,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },

    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        appTheme.borderColor,
    },

    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "12",
    },

    rowText: {
      flex: 1,
      alignItems: "flex-end",
      minWidth: 0,
    },

    rowLabel: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
    },

    rowValue: {
      marginTop: 3,
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
    },

    changeButton: {
      minWidth: 66,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor,
    },

    changeButtonText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
    },

    ratingCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
      padding: 16,
    },

    ratingTop: {
      flexDirection: "row-reverse",
      alignItems: "stretch",
      gap: 12,
    },

    ratingScoreBox: {
      width: 108,
      minHeight: 104,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFF7E6",
      borderWidth: 1,
      borderColor: "#FDE7B2",
    },

    ratingAverage: {
      marginTop: 3,
      color: appTheme.textColor,
      fontSize: 25,
      fontWeight: "900",
    },

    ratingAverageLabel: {
      marginTop: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "800",
    },

    ratingSummary: {
      flex: 1,
      justifyContent: "center",
      alignItems: "flex-end",
      minWidth: 0,
    },

    ratingTotal: {
      color: appTheme.textColor,
      fontSize: 24,
      fontWeight: "900",
      textAlign: "right",
    },

    ratingTotalLabel: {
      marginTop: -2,
      color: appTheme.textColor,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "right",
    },

    ratingHint: {
      marginTop: 7,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "right",
    },

    ratingDetailsButton: {
      marginTop: 14,
      minHeight: 48,
      borderRadius: 15,
      backgroundColor: appTheme.primaryColor,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 14,
    },

    ratingDetailsButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },

    ratingModalCard: {
      maxHeight: "88%",
    },

    modalCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.primaryColor + "0C",
      marginRight: 4,
    },

    ratingModalScroll: {
      flexGrow: 0,
    },

    ratingGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingTop: 2,
      paddingBottom: 4,
    },

    ratingItemCard: {
      width: "48%",
      marginBottom: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
      padding: 12,
    },

    ratingItemTop: {
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 4,
      marginBottom: 10,
    },

    ratingStars: {
      flexDirection: "row",
      gap: 1,
    },

    ratingItemDate: {
      color: appTheme.secondaryTextColor,
      fontSize: 9,
      fontWeight: "700",
    },

    ratingMetaRow: {
      marginTop: 7,
    },

    ratingMetaLabel: {
      color: appTheme.secondaryTextColor,
      fontSize: 9,
      fontWeight: "700",
      textAlign: "right",
    },

    ratingMetaValue: {
      marginTop: 2,
      color: appTheme.textColor,
      fontSize: 11,
      fontWeight: "900",
      textAlign: "right",
    },

    ratingCommentBox: {
      marginTop: 10,
      padding: 9,
      borderRadius: 12,
      backgroundColor: appTheme.primaryColor + "08",
    },

    ratingCommentLabel: {
      color: appTheme.primaryColor,
      fontSize: 9,
      fontWeight: "900",
      textAlign: "right",
    },

    ratingComment: {
      marginTop: 4,
      color: appTheme.textColor,
      fontSize: 10,
      lineHeight: 16,
      fontWeight: "600",
      textAlign: "right",
    },

    ratingPagination: {
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: appTheme.borderColor,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    ratingPageNumbers: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 2,
    },

    ratingPageArrow: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.primaryColor + "0C",
    },

    ratingPageDisabled: {
      opacity: 0.45,
    },

    ratingPageButton: {
      minWidth: 34,
      height: 34,
      paddingHorizontal: 8,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
    },

    ratingPageButtonActive: {
      backgroundColor: appTheme.primaryColor,
      borderColor: appTheme.primaryColor,
    },

    ratingPageText: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "900",
    },

    ratingPageTextActive: {
      color: "#FFFFFF",
    },

    ratingModalLoading: {
      minHeight: 260,
      alignItems: "center",
      justifyContent: "center",
    },

    ratingModalLoadingText: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "800",
    },

    ratingEmpty: {
      minHeight: 260,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 22,
    },

    ratingEmptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFF7E6",
    },

    ratingEmptyTitle: {
      marginTop: 12,
      color: appTheme.textColor,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
    },

    ratingEmptyText: {
      marginTop: 6,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "center",
    },

    infoNotice: {
      marginTop: 12,
      padding: 13,
      borderRadius: 17,
      backgroundColor:
        appTheme.primaryColor + "0B",
      borderWidth: 1,
      borderColor:
        appTheme.primaryColor + "18",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 9,
    },

    infoNoticeText: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "right",
    },

    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 30,
    },

    emptyTitle: {
      marginTop: 12,
      color: appTheme.textColor,
      fontSize: 18,
      fontWeight: "900",
    },

    emptyText: {
      marginTop: 6,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
    },

    modalBackdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
      backgroundColor:
        "rgba(15,23,42,.58)",
    },

    modalCard: {
      width: "100%",
      maxWidth: 520,
      borderRadius: 24,
      padding: 20,
      backgroundColor:
        appTheme.cardColor,
      borderWidth: 1,
      borderColor:
        appTheme.borderColor,
    },

    modalHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },

    modalIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "12",
    },

    modalHeaderText: {
      flex: 1,
      alignItems: "flex-end",
    },

    modalTitle: {
      color: appTheme.textColor,
      fontSize: 18,
      fontWeight: "900",
      textAlign: "right",
    },

    modalSubtitle: {
      marginTop: 3,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
    },

    fieldBlock: {
      marginTop: 10,
    },

    fieldLabel: {
      marginBottom: 7,
      color: appTheme.textColor,
      fontSize: 11,
      fontWeight: "900",
      textAlign: "right",
    },

    inputWrap: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor:
        appTheme.backgroundColor,
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingHorizontal: 10,
    },

    inputIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "10",
    },

    input: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 10,
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "700",
    },

    otpBox: {
      marginBottom: 8,
      padding: 13,
      borderRadius: 15,
      backgroundColor:
        appTheme.primaryColor + "0B",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },

    otpText: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "right",
    },

    primaryButton: {
      minHeight: 50,
      marginTop: 16,
      borderRadius: 14,
      backgroundColor:
        appTheme.primaryColor,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row-reverse",
      gap: 8,
      paddingHorizontal: 16,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },

    linkButton: {
      alignItems: "center",
      paddingVertical: 11,
    },

    linkButtonText: {
      color: appTheme.primaryColor,
      fontSize: 11,
      fontWeight: "900",
    },

    cancelButton: {
      marginTop: 8,
      minHeight: 44,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F1F5F9",
    },

    cancelText: {
      color: "#475569",
      fontSize: 12,
      fontWeight: "900",
    },
  });
