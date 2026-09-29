# DZWAN / ZAJEL — REAL 47 MAP

## 01 — auth / admin / permission
Status: FOUND
Routes:
- GET /permissions/:userId [src/routes/ops-31-47.routes.ts]
- PATCH /permissions/:userId [src/routes/ops-31-47.routes.ts]
- POST /sub-admins [src/routes/completion.routes.ts]
- GET /sub-admins [src/routes/completion.routes.ts]
- PATCH /sub-admins/:id [src/routes/completion.routes.ts]
- GET /reports/admin [src/routes/requirements-11-29.routes.ts]
- POST /login [src/routes/auth.routes.ts]
- POST /refresh [src/routes/auth.routes.ts]
- GET /me [src/routes/auth.routes.ts]
- POST /logout [src/routes/auth.routes.ts]
Controllers:
- src/controllers/auth.controller.ts
Services:
- src/services/r25-admin-report.service.ts
- src/services/auth.service.ts
Models:
- src/models/StaffPermission.ts

## 02 — governorate
Status: NOT_FOUND

## 03 — area
Status: FOUND
Routes:
- POST /me [src/routes/captain-work-area.routes.ts]
- GET /me [src/routes/captain-work-area.routes.ts]
- POST /:captainId [src/routes/captain-work-area.routes.ts]
- GET /:captainId [src/routes/captain-work-area.routes.ts]
- PATCH /:id/toggle [src/routes/captain-work-area.routes.ts]
- DELETE /:id [src/routes/captain-work-area.routes.ts]
- POST /:id/areas [src/routes/location.routes.ts]
- PATCH /:id/areas/:areaId [src/routes/location.routes.ts]
- DELETE /:id/areas/:areaId [src/routes/location.routes.ts]
- GET /captains/:captainId/work-areas [src/routes/requirements-11-29.routes.ts]
Controllers:
- src/controllers/captain-work-area.controller.ts
Services:
- src/services/captain-work-area.service.ts
Models:
- src/models/CaptainWorkArea.ts
- src/models/CaptainWorkAreaFinal.ts

## 04 — pricing
Status: FOUND
Routes:
- GET / [src/routes/pricing.routes.ts]
- POST / [src/routes/pricing.routes.ts]
- PATCH /:id [src/routes/pricing.routes.ts]
- DELETE /:id [src/routes/pricing.routes.ts]
Controllers:
- src/controllers/pricing.controller.ts
Services:
- src/services/pricing.service.ts
Models:
- src/models/PricingRule.ts

## 05 — establishment / registration
Status: FOUND
Routes:
- GET /establishments/:establishmentId [src/routes/establishment-report.routes.ts]
- GET / [src/routes/establishment-user.routes.ts]
- POST / [src/routes/establishment-user.routes.ts]
- GET /:id [src/routes/establishment-user.routes.ts]
- PATCH /:id [src/routes/establishment-user.routes.ts]
- DELETE /:id [src/routes/establishment-user.routes.ts]
- POST / [src/routes/captain-registration.routes.ts]
- GET / [src/routes/captain-registration.routes.ts]
- POST /:id/approve [src/routes/captain-registration.routes.ts]
- POST /:id/reject [src/routes/captain-registration.routes.ts]
- POST /:id/suspend [src/routes/core11-establishment.routes.ts]
- POST /:id/reactivate [src/routes/core11-establishment.routes.ts]
- PATCH /:id/location [src/routes/core11-establishment.routes.ts]
- GET /reports/establishments/:establishmentId [src/routes/requirements-11-29.routes.ts]
- GET / [src/routes/establishment.routes.ts]
Controllers:
- src/controllers/captain-registration.controller.ts
- src/controllers/establishment.controller.ts
- src/controllers/establishment-user.controller.ts
- src/controllers/core11-establishment.controller.ts
- src/controllers/establishment-report.controller.ts
Services:
- src/services/establishment-access.service.ts
- src/services/establishment-location.service.ts
- src/services/establishment-report.service.ts
- src/services/r24-establishment-report.service.ts
Models:
- src/models/Establishment.ts
- src/models/CaptainRegistration.ts
- src/models/EstablishmentReport.ts

## 06 — establishment / location
Status: FOUND
Routes:
- GET / [src/routes/scoped-location.routes.ts]
- GET /establishments/:establishmentId [src/routes/establishment-report.routes.ts]
- GET / [src/routes/establishment-user.routes.ts]
- POST / [src/routes/establishment-user.routes.ts]
- GET /:id [src/routes/establishment-user.routes.ts]
- PATCH /:id [src/routes/establishment-user.routes.ts]
- DELETE /:id [src/routes/establishment-user.routes.ts]
- POST /:id/suspend [src/routes/core11-establishment.routes.ts]
- POST /:id/reactivate [src/routes/core11-establishment.routes.ts]
- PATCH /:id/location [src/routes/core11-establishment.routes.ts]
- GET / [src/routes/location.routes.ts]
- POST / [src/routes/location.routes.ts]
- PATCH /:id [src/routes/location.routes.ts]
- DELETE /:id [src/routes/location.routes.ts]
- POST /:id/areas [src/routes/location.routes.ts]
Controllers:
- src/controllers/location.controller.ts
- src/controllers/establishment.controller.ts
- src/controllers/establishment-user.controller.ts
- src/controllers/core11-establishment.controller.ts
- src/controllers/scoped-location.controller.ts
- src/controllers/establishment-report.controller.ts
Services:
- src/services/establishment-access.service.ts
- src/services/establishment-location.service.ts
- src/services/establishment-report.service.ts
- src/services/r24-establishment-report.service.ts
Models:
- src/models/Establishment.ts
- src/models/Location.ts
- src/models/EstablishmentReport.ts

## 07 — customer / snapshot / order
Status: FOUND
Routes:
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- POST /:orderId/otp [src/routes/delivery-proof.routes.ts]
- POST /:orderId/otp/verify [src/routes/delivery-proof.routes.ts]
- POST /:orderId/photo [src/routes/delivery-proof.routes.ts]
- GET /:orderId [src/routes/delivery-proof.routes.ts]
- GET / [src/routes/order.routes.ts]
- POST / [src/routes/order.routes.ts]
- GET /:id [src/routes/order.routes.ts]
- PATCH /:id/status [src/routes/order.routes.ts]
- POST /:id/assign-captain [src/routes/order.routes.ts]
- GET /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers/:stage/finish [src/routes/ops-31-47.routes.ts]
Controllers:
- src/controllers/order.controller.ts
- src/controllers/customer.controller.ts
Services:
- src/services/order-customer-snapshot.service.ts
- src/services/order-timeline-30-46.service.ts
- src/services/r29-order-timeline.service.ts
- src/services/r21-order-notes.service.ts
- src/services/core-order-flow.service.ts
- src/services/order-cash.service.ts
- src/services/order-intake-1-11.service.ts
- src/services/order-lifecycle-1-11.service.ts
Models:
- src/models/Order.ts
- src/models/OrderStageEvent.ts
- src/models/OrderStageTimer.ts
- src/models/Core11OrderState.ts
- src/models/CustomerAddress.ts
- src/models/OrderTimeline.ts
- src/models/StuckOrderAlert.ts

## 08 — order / intake
Status: FOUND
Routes:
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- POST /:orderId/otp [src/routes/delivery-proof.routes.ts]
- POST /:orderId/otp/verify [src/routes/delivery-proof.routes.ts]
- POST /:orderId/photo [src/routes/delivery-proof.routes.ts]
- GET /:orderId [src/routes/delivery-proof.routes.ts]
- GET / [src/routes/order.routes.ts]
- POST / [src/routes/order.routes.ts]
- GET /:id [src/routes/order.routes.ts]
- PATCH /:id/status [src/routes/order.routes.ts]
- POST /:id/assign-captain [src/routes/order.routes.ts]
- GET /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers/:stage/finish [src/routes/ops-31-47.routes.ts]
Controllers:
- src/controllers/order.controller.ts
Services:
- src/services/order-customer-snapshot.service.ts
- src/services/order-timeline-30-46.service.ts
- src/services/r29-order-timeline.service.ts
- src/services/r21-order-notes.service.ts
- src/services/core-order-flow.service.ts
- src/services/order-cash.service.ts
- src/services/order-intake-1-11.service.ts
- src/services/order-lifecycle-1-11.service.ts
Models:
- src/models/Order.ts
- src/models/OrderStageEvent.ts
- src/models/OrderStageTimer.ts
- src/models/Core11OrderState.ts
- src/models/OrderTimeline.ts
- src/models/StuckOrderAlert.ts

## 09 — order / lifecycle / status
Status: FOUND
Routes:
- GET /api/system/status [src/server.ts]
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- PATCH /:id/status [src/routes/users.routes.ts]
- POST /:orderId/otp [src/routes/delivery-proof.routes.ts]
- POST /:orderId/otp/verify [src/routes/delivery-proof.routes.ts]
- POST /:orderId/photo [src/routes/delivery-proof.routes.ts]
- GET /:orderId [src/routes/delivery-proof.routes.ts]
- GET / [src/routes/order.routes.ts]
- POST / [src/routes/order.routes.ts]
- GET /:id [src/routes/order.routes.ts]
- PATCH /:id/status [src/routes/order.routes.ts]
- POST /:id/assign-captain [src/routes/order.routes.ts]
- GET /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
Controllers:
- src/controllers/order.controller.ts
Services:
- src/services/order-customer-snapshot.service.ts
- src/services/order-timeline-30-46.service.ts
- src/services/r29-order-timeline.service.ts
- src/services/r21-order-notes.service.ts
- src/services/core-order-flow.service.ts
- src/services/order-cash.service.ts
- src/services/order-intake-1-11.service.ts
- src/services/order-lifecycle-1-11.service.ts
Models:
- src/models/Order.ts
- src/models/OrderStageEvent.ts
- src/models/OrderStageTimer.ts
- src/models/Core11OrderState.ts
- src/models/OrderTimeline.ts
- src/models/StuckOrderAlert.ts

## 10 — dispatch
Status: FOUND
Routes:
- GET /settings [src/routes/dispatch.routes.ts]
- PATCH /settings [src/routes/dispatch.routes.ts]
- POST /shifts [src/routes/dispatch.routes.ts]
- GET /shifts [src/routes/dispatch.routes.ts]
- DELETE /shifts/:id [src/routes/dispatch.routes.ts]
- GET /queue [src/routes/dispatch.routes.ts]
- GET /assignments [src/routes/dispatch.routes.ts]
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- POST /process [src/routes/dispatch.routes.ts]
- POST /orders/:orderId/re-dispatch [src/routes/ops-31-47.routes.ts]
Controllers:
- src/controllers/dispatch.controller.ts
Services:
- src/services/dispatch-manager.service.ts
- src/services/dispatch-policy-1-11.service.ts
- src/services/smart-dispatch-score.service.ts
- src/services/dispatch.service.ts
Models:
- src/models/DispatchAssignment.ts
- src/models/DispatchQueue.ts
- src/models/DispatchSettings.ts

## 11 — shift / strict-shift / shift-policy
Status: FOUND
Routes:
- POST /shifts [src/routes/dispatch.routes.ts]
- GET /shifts [src/routes/dispatch.routes.ts]
- DELETE /shifts/:id [src/routes/dispatch.routes.ts]
- POST / [src/routes/captain-shift-management.routes.ts]
- PATCH /:id [src/routes/captain-shift-management.routes.ts]
- POST /weekly/select [src/routes/captain-shift-management.routes.ts]
- POST /weekly/change [src/routes/captain-shift-management.routes.ts]
- GET /current/check [src/routes/captain-shift-management.routes.ts]
- GET /shift/check [src/routes/requirements-11-29.routes.ts]
Controllers:
- src/controllers/captain-shift-management.controller.ts
Services:
- src/services/shift-policy-1-11.service.ts
- src/services/strict-shift-enforcement.service.ts
- src/services/r11-shift-guard.service.ts
- src/services/captain-shift-management.service.ts
- src/services/weekly-shift-policy.service.ts
Models:
- src/models/CaptainShift.ts

## 12 — attendance
Status: FOUND
Routes:
- POST /check-in [src/routes/captain-attendance.routes.ts]
- POST /check-out [src/routes/captain-attendance.routes.ts]
- GET /me [src/routes/captain-attendance.routes.ts]
- GET / [src/routes/captain-attendance.routes.ts]
- POST /captains/:captainId/attendance/in [src/routes/requirements-11-29.routes.ts]
- POST /captains/:captainId/attendance/out [src/routes/requirements-11-29.routes.ts]
Controllers:
- src/controllers/captain-attendance.controller.ts
Services:
- src/services/r12-attendance.service.ts
Models:
- src/models/CaptainAttendance.ts

## 13 — captain-registration / registration
Status: FOUND
Routes:
- POST / [src/routes/captain-registration.routes.ts]
- GET / [src/routes/captain-registration.routes.ts]
- POST /:id/approve [src/routes/captain-registration.routes.ts]
- POST /:id/reject [src/routes/captain-registration.routes.ts]
Controllers:
- src/controllers/captain-registration.controller.ts
Models:
- src/models/CaptainRegistration.ts

## 14 — captain
Status: FOUND
Routes:
- GET / [src/routes/captain.routes.ts]
- GET /:id [src/routes/captain.routes.ts]
- PATCH /:id [src/routes/captain.routes.ts]
- POST /:id/approve [src/routes/captain.routes.ts]
- POST /:id/reject [src/routes/captain.routes.ts]
- DELETE /:id [src/routes/captain.routes.ts]
- GET /me [src/routes/captain-ledger.routes.ts]
- GET /:captainId [src/routes/captain-ledger.routes.ts]
- POST /check-in [src/routes/captain-attendance.routes.ts]
- POST /check-out [src/routes/captain-attendance.routes.ts]
- GET /me [src/routes/captain-attendance.routes.ts]
- GET / [src/routes/captain-attendance.routes.ts]
- POST / [src/routes/captain-registration.routes.ts]
- GET / [src/routes/captain-registration.routes.ts]
- POST /:id/approve [src/routes/captain-registration.routes.ts]
Controllers:
- src/controllers/captain.controller.ts
- src/controllers/captain-registration.controller.ts
- src/controllers/captain-shift-management.controller.ts
- src/controllers/captain-ledger.controller.ts
- src/controllers/captain-document.controller.ts
- src/controllers/captain-work-area.controller.ts
- src/controllers/captain-attendance.controller.ts
Services:
- src/services/captain-document-compliance.service.ts
- src/services/r14-captain-profile.service.ts
- src/services/captain-work-area.service.ts
- src/services/captain-shift-management.service.ts
- src/services/captain-work-eligibility.service.ts
- src/services/captain-kpi.service.ts
- src/services/captain-ledger.service.ts
- src/services/captain-cash.service.ts
- src/services/captain-rating.service.ts
Models:
- src/models/CaptainRating.ts
- src/models/CaptainDocument.ts
- src/models/CaptainShift.ts
- src/models/CaptainWorkArea.ts
- src/models/CaptainCashTransaction.ts
- src/models/CaptainAttendance.ts
- src/models/CaptainRegistration.ts
- src/models/CaptainWorkAreaFinal.ts
- src/models/CaptainEmergency.ts
- src/models/CaptainRatingFinal.ts

## 15 — work-area
Status: FOUND
Routes:
- POST /me [src/routes/captain-work-area.routes.ts]
- GET /me [src/routes/captain-work-area.routes.ts]
- POST /:captainId [src/routes/captain-work-area.routes.ts]
- GET /:captainId [src/routes/captain-work-area.routes.ts]
- PATCH /:id/toggle [src/routes/captain-work-area.routes.ts]
- DELETE /:id [src/routes/captain-work-area.routes.ts]
- GET /captains/:captainId/work-areas [src/routes/requirements-11-29.routes.ts]
Controllers:
- src/controllers/captain-work-area.controller.ts
Services:
- src/services/captain-work-area.service.ts

## 16 — dispatch / maxActiveOrders / operations
Status: FOUND
Routes:
- GET /settings [src/routes/dispatch.routes.ts]
- PATCH /settings [src/routes/dispatch.routes.ts]
- POST /shifts [src/routes/dispatch.routes.ts]
- GET /shifts [src/routes/dispatch.routes.ts]
- DELETE /shifts/:id [src/routes/dispatch.routes.ts]
- GET /queue [src/routes/dispatch.routes.ts]
- GET /assignments [src/routes/dispatch.routes.ts]
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- POST /process [src/routes/dispatch.routes.ts]
- POST /orders/:orderId/re-dispatch [src/routes/ops-31-47.routes.ts]
- GET /dashboard/operations [src/routes/requirements-11-29.routes.ts]
- GET / [src/routes/core-operations-settings.routes.ts]
- PATCH / [src/routes/core-operations-settings.routes.ts]
Controllers:
- src/controllers/core-operations-settings.controller.ts
- src/controllers/dispatch.controller.ts
Services:
- src/services/dispatch-manager.service.ts
- src/services/dispatch-policy-1-11.service.ts
- src/services/smart-dispatch-score.service.ts
- src/services/dispatch.service.ts
Models:
- src/models/OperationsSettings.ts
- src/models/DispatchAssignment.ts
- src/models/CoreOperationsSettings.ts
- src/models/DispatchQueue.ts
- src/models/CentralOperationSetting.ts
- src/models/DispatchSettings.ts

## 17 — cash
Status: FOUND
Routes:
- POST /cash [src/routes/completion.routes.ts]
- GET /cash/:captainId [src/routes/completion.routes.ts]
- GET /captains/:captainId/cash-statement [src/routes/requirements-11-29.routes.ts]
- POST /orders/:orderId/cash/:captainId [src/routes/requirements-11-29.routes.ts]
Services:
- src/services/r17-cash.service.ts
- src/services/order-cash.service.ts
- src/services/captain-cash.service.ts
Models:
- src/models/CaptainCashTransaction.ts

## 18 — ledger / cash
Status: FOUND
Routes:
- GET /me [src/routes/captain-ledger.routes.ts]
- GET /:captainId [src/routes/captain-ledger.routes.ts]
- POST /cash [src/routes/completion.routes.ts]
- GET /cash/:captainId [src/routes/completion.routes.ts]
- GET /captains/:captainId/cash-statement [src/routes/requirements-11-29.routes.ts]
- POST /orders/:orderId/cash/:captainId [src/routes/requirements-11-29.routes.ts]
Controllers:
- src/controllers/captain-ledger.controller.ts
Services:
- src/services/r17-cash.service.ts
- src/services/order-cash.service.ts
- src/services/captain-ledger.service.ts
- src/services/captain-cash.service.ts
Models:
- src/models/CaptainCashTransaction.ts
- src/models/CaptainLedger.ts

## 19 — delivery-proof
Status: FOUND
Routes:
- POST /:orderId/otp [src/routes/delivery-proof.routes.ts]
- POST /:orderId/otp/verify [src/routes/delivery-proof.routes.ts]
- POST /:orderId/photo [src/routes/delivery-proof.routes.ts]
- GET /:orderId [src/routes/delivery-proof.routes.ts]
Controllers:
- src/controllers/delivery-proof.controller.ts
Services:
- src/services/delivery-proof.service.ts
- src/services/r19-delivery-proof-final.service.ts

## 20 — pickup / completion
Status: FOUND
Routes:
- POST /ratings [src/routes/completion.routes.ts]
- GET /ratings/:captainId [src/routes/completion.routes.ts]
- POST /cash [src/routes/completion.routes.ts]
- GET /cash/:captainId [src/routes/completion.routes.ts]
- GET /kpi/captains/:captainId [src/routes/completion.routes.ts]
- GET /audit [src/routes/completion.routes.ts]
- POST /audit [src/routes/completion.routes.ts]
- GET /settings [src/routes/completion.routes.ts]
- PATCH /settings [src/routes/completion.routes.ts]
- GET /notification-rules [src/routes/completion.routes.ts]
- PUT /notification-rules/:event [src/routes/completion.routes.ts]
- POST /sub-admins [src/routes/completion.routes.ts]
- GET /sub-admins [src/routes/completion.routes.ts]
- PATCH /sub-admins/:id [src/routes/completion.routes.ts]
Controllers:
- src/controllers/completion.controller.ts
Models:
- src/models/PickupPhoto.ts

## 21 — order-note / order / notes
Status: FOUND
Routes:
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- POST /:orderId/otp [src/routes/delivery-proof.routes.ts]
- POST /:orderId/otp/verify [src/routes/delivery-proof.routes.ts]
- POST /:orderId/photo [src/routes/delivery-proof.routes.ts]
- GET /:orderId [src/routes/delivery-proof.routes.ts]
- GET / [src/routes/order.routes.ts]
- POST / [src/routes/order.routes.ts]
- GET /:id [src/routes/order.routes.ts]
- PATCH /:id/status [src/routes/order.routes.ts]
- POST /:id/assign-captain [src/routes/order.routes.ts]
- GET /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers/:stage/finish [src/routes/ops-31-47.routes.ts]
Controllers:
- src/controllers/order.controller.ts
Services:
- src/services/order-customer-snapshot.service.ts
- src/services/order-timeline-30-46.service.ts
- src/services/r29-order-timeline.service.ts
- src/services/r21-order-notes.service.ts
- src/services/core-order-flow.service.ts
- src/services/order-cash.service.ts
- src/services/order-intake-1-11.service.ts
- src/services/order-lifecycle-1-11.service.ts
Models:
- src/models/Order.ts
- src/models/OrderStageEvent.ts
- src/models/OrderStageTimer.ts
- src/models/Core11OrderState.ts
- src/models/OrderTimeline.ts
- src/models/StuckOrderAlert.ts

## 22 — rating
Status: FOUND
Routes:
- POST /ratings [src/routes/completion.routes.ts]
- GET /ratings/:captainId [src/routes/completion.routes.ts]
- GET /captains/:captainId/rating [src/routes/requirements-11-29.routes.ts]
- POST /orders/:orderId/rating [src/routes/requirements-11-29.routes.ts]
Services:
- src/services/r22-rating-final.service.ts
- src/services/captain-rating.service.ts
Models:
- src/models/CaptainRating.ts
- src/models/CaptainRatingFinal.ts

## 23 — kpi / performance
Status: FOUND
Routes:
- GET /kpi/captains/:captainId [src/routes/completion.routes.ts]
- GET /captains/:captainId/kpi [src/routes/requirements-11-29.routes.ts]
Services:
- src/services/captain-kpi.service.ts
- src/services/r23-kpi-final.service.ts

## 24 — establishment-report
Status: FOUND
Routes:
- GET /establishments/:establishmentId [src/routes/establishment-report.routes.ts]
Controllers:
- src/controllers/establishment-report.controller.ts
Services:
- src/services/establishment-report.service.ts
- src/services/r24-establishment-report.service.ts

## 25 — reports
Status: FOUND
Routes:
- GET / [src/routes/reports.routes.ts]
- GET /reports/establishments/:establishmentId [src/routes/requirements-11-29.routes.ts]
- GET /reports/admin [src/routes/requirements-11-29.routes.ts]
Controllers:
- src/controllers/reports.controller.ts

## 26 — dashboard
Status: FOUND
Routes:
- GET /dashboard/operations [src/routes/requirements-11-29.routes.ts]
Services:
- src/services/r26-dashboard.service.ts

## 27 — notification
Status: FOUND
Routes:
- GET / [src/routes/notification.routes.ts]
- PATCH /:id/read [src/routes/notification.routes.ts]
- POST /read-all [src/routes/notification.routes.ts]
- GET /notification-rules [src/routes/completion.routes.ts]
- PUT /notification-rules/:event [src/routes/completion.routes.ts]
Controllers:
- src/controllers/notification.controller.ts
Services:
- src/services/notification.service.ts
- src/services/r27-notification-target.service.ts
- src/services/event-notification.service.ts
Models:
- src/models/Notification.ts
- src/models/NotificationRule.ts

## 28 — complaint
Status: FOUND
Routes:
- POST /complaints [src/routes/ops-31-47.routes.ts]
- GET /complaints [src/routes/ops-31-47.routes.ts]
- PATCH /complaints/:id [src/routes/ops-31-47.routes.ts]
- POST /complaints [src/routes/requirements-11-29.routes.ts]
- GET /complaints/:id [src/routes/requirements-11-29.routes.ts]
- POST /complaints [src/routes/requirements-30-46.routes.ts]
Models:
- src/models/Complaint.ts
- src/models/Complaint30_46.ts

## 29 — timeline
Status: FOUND
Routes:
- GET /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timeline [src/routes/ops-31-47.routes.ts]
- GET /orders/:orderId/timeline [src/routes/requirements-11-29.routes.ts]
- GET /orders/:orderId/timeline/full [src/routes/requirements-11-29.routes.ts]
- GET /orders/:orderId/timeline [src/routes/requirements-30-46.routes.ts]
Services:
- src/services/order-timeline-30-46.service.ts
- src/services/r29-order-timeline.service.ts
Models:
- src/models/OrderTimeline.ts

## 30 — timer / stage
Status: FOUND
Routes:
- POST /orders/:orderId/timers [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/timers/:stage/finish [src/routes/ops-31-47.routes.ts]
Models:
- src/models/OrderStageEvent.ts
- src/models/OrderStageTimer.ts

## 31 — stuck
Status: FOUND
Routes:
- POST /stuck/process [src/routes/ops-31-47.routes.ts]
- GET /stuck [src/routes/ops-31-47.routes.ts]
- PATCH /stuck/:id/resolve [src/routes/ops-31-47.routes.ts]
- GET /stuck-orders [src/routes/requirements-30-46.routes.ts]
Models:
- src/models/StuckOrderAlert.ts

## 32 — redispatch / dispatch
Status: FOUND
Routes:
- GET /settings [src/routes/dispatch.routes.ts]
- PATCH /settings [src/routes/dispatch.routes.ts]
- POST /shifts [src/routes/dispatch.routes.ts]
- GET /shifts [src/routes/dispatch.routes.ts]
- DELETE /shifts/:id [src/routes/dispatch.routes.ts]
- GET /queue [src/routes/dispatch.routes.ts]
- GET /assignments [src/routes/dispatch.routes.ts]
- POST /orders/:id/dispatch [src/routes/dispatch.routes.ts]
- POST /orders/:id/accept [src/routes/dispatch.routes.ts]
- POST /process [src/routes/dispatch.routes.ts]
- POST /orders/:orderId/re-dispatch [src/routes/ops-31-47.routes.ts]
Controllers:
- src/controllers/dispatch.controller.ts
Services:
- src/services/dispatch-manager.service.ts
- src/services/dispatch-policy-1-11.service.ts
- src/services/smart-dispatch-score.service.ts
- src/services/dispatch.service.ts
Models:
- src/models/DispatchAssignment.ts
- src/models/DispatchQueue.ts
- src/models/DispatchSettings.ts

## 33 — emergency
Status: FOUND
Models:
- src/models/CaptainEmergency.ts
- src/models/EmergencyAlert.ts

## 34 — audit
Status: FOUND
Routes:
- GET /audit [src/routes/completion.routes.ts]
- POST /audit [src/routes/completion.routes.ts]
- GET / [src/routes/audit.routes.ts]
- GET /:id [src/routes/audit.routes.ts]
Controllers:
- src/controllers/audit.controller.ts
Services:
- src/services/audit.service.ts
- src/services/audit-log.service.ts
- src/services/system-audit.service.ts
Models:
- src/models/AuditLog.ts

## 35 — sub-admin / staff
Status: FOUND
Routes:
- POST /sub-admins [src/routes/completion.routes.ts]
- GET /sub-admins [src/routes/completion.routes.ts]
- PATCH /sub-admins/:id [src/routes/completion.routes.ts]
- GET / [src/routes/staff.routes.ts]
- POST /:userId [src/routes/staff.routes.ts]
- PATCH /:id [src/routes/staff.routes.ts]
Controllers:
- src/controllers/staff.controller.ts
Models:
- src/models/StaffProfile.ts
- src/models/StaffPermission.ts

## 36 — permission / staff-permission
Status: FOUND
Routes:
- GET /permissions/:userId [src/routes/ops-31-47.routes.ts]
- PATCH /permissions/:userId [src/routes/ops-31-47.routes.ts]
Models:
- src/models/StaffPermission.ts

## 37 — document / compliance
Status: FOUND
Routes:
- POST / [src/routes/captain-document.routes.ts]
- GET /me [src/routes/captain-document.routes.ts]
- GET /captain/:captainId [src/routes/captain-document.routes.ts]
- PATCH /:id/review [src/routes/captain-document.routes.ts]
Controllers:
- src/controllers/captain-document.controller.ts
Services:
- src/services/captain-document-compliance.service.ts
Models:
- src/models/CaptainDocument.ts

## 38 — version / app-version
Status: FOUND
Routes:
- POST /app-versions [src/routes/ops-31-47.routes.ts]
- GET /app-versions [src/routes/ops-31-47.routes.ts]
- GET /app-version-check [src/routes/ops-31-47.routes.ts]
- GET /versions/:app [src/routes/requirements-30-46.routes.ts]
Models:
- src/models/AppVersion.ts

## 39 — version / force
Status: FOUND
Routes:
- POST /app-versions [src/routes/ops-31-47.routes.ts]
- GET /app-versions [src/routes/ops-31-47.routes.ts]
- GET /app-version-check [src/routes/ops-31-47.routes.ts]
- GET /versions/:app [src/routes/requirements-30-46.routes.ts]
Services:
- src/services/strict-shift-enforcement.service.ts
Models:
- src/models/AppVersion.ts

## 40 — security
Status: FOUND
Routes:
- POST /security-events [src/routes/ops-31-47.routes.ts]
- POST /security-log [src/routes/requirements-30-46.routes.ts]
Models:
- src/models/SystemSecurityLog.ts
- src/models/SecurityEvent.ts

## 41 — search
Status: FOUND
Routes:
- GET /search [src/routes/ops-31-47.routes.ts]

## 42 — backup
Status: NOT_FOUND

## 43 — maintenance
Status: FOUND
Routes:
- GET /maintenance [src/routes/ops-31-47.routes.ts]
- PATCH /maintenance [src/routes/ops-31-47.routes.ts]
- GET /maintenance [src/routes/requirements-30-46.routes.ts]
Models:
- src/models/MaintenanceSettings.ts

## 44 — system-settings / settings / central
Status: FOUND
Routes:
- GET /settings [src/routes/dispatch.routes.ts]
- PATCH /settings [src/routes/dispatch.routes.ts]
- GET / [src/routes/system-settings.routes.ts]
- PATCH / [src/routes/system-settings.routes.ts]
- GET / [src/routes/settings.routes.ts]
- GET / [src/routes/core11-settings.routes.ts]
- PATCH / [src/routes/core11-settings.routes.ts]
- GET /settings [src/routes/completion.routes.ts]
- PATCH /settings [src/routes/completion.routes.ts]
- GET / [src/routes/core-operations-settings.routes.ts]
- PATCH / [src/routes/core-operations-settings.routes.ts]
- GET /settings [src/routes/requirements-30-46.routes.ts]
- PUT /settings [src/routes/requirements-30-46.routes.ts]
Controllers:
- src/controllers/core-operations-settings.controller.ts
- src/controllers/settings.controller.ts
- src/controllers/system-settings.controller.ts
Services:
- src/services/system-settings.service.ts
Models:
- src/models/OperationsSettings.ts
- src/models/SystemSettings.ts
- src/models/CoreOperationsSettings.ts
- src/models/MaintenanceSettings.ts
- src/models/CentralOperationSetting.ts
- src/models/DispatchSettings.ts

## 45 — geofence
Status: FOUND
Routes:
- GET /geofence/resolve [src/routes/requirements-30-46.routes.ts]
- GET / [src/routes/geofence.routes.ts]
- POST / [src/routes/geofence.routes.ts]
- PATCH /:id [src/routes/geofence.routes.ts]
- DELETE /:id [src/routes/geofence.routes.ts]
Controllers:
- src/controllers/geofence.controller.ts
Models:
- src/models/Geofence.ts

## 46 — cancellation / cancel
Status: FOUND
Routes:
- POST /orders/:orderId/cancel [src/routes/ops-31-47.routes.ts]
- POST /orders/:orderId/cancel [src/routes/requirements-30-46.routes.ts]
Models:
- src/models/CancellationRecord.ts

## 47 — notification / event
Status: FOUND
Routes:
- GET / [src/routes/notification.routes.ts]
- PATCH /:id/read [src/routes/notification.routes.ts]
- POST /read-all [src/routes/notification.routes.ts]
- POST /security-events [src/routes/ops-31-47.routes.ts]
- GET /notification-rules [src/routes/completion.routes.ts]
- PUT /notification-rules/:event [src/routes/completion.routes.ts]
- POST /orders/:orderId/events [src/routes/requirements-11-29.routes.ts]
- POST /orders/:orderId/events [src/routes/requirements-30-46.routes.ts]
Controllers:
- src/controllers/notification.controller.ts
Services:
- src/services/notification.service.ts
- src/services/r27-notification-target.service.ts
- src/services/event-notification.service.ts
Models:
- src/models/OrderStageEvent.ts
- src/models/Notification.ts
- src/models/NotificationRule.ts
- src/models/SecurityEvent.ts
