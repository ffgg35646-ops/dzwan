import { api } from "./client";

export async function getCaptainCapacity(captainId: string) {
  const response = await api.get(
    `/requirements/captains/${captainId}/capacity`
  );
  return response.data;
}

export async function getCaptainWorkAreas(captainId: string) {
  const response = await api.get(
    `/requirements/captains/${captainId}/work-areas`
  );
  return response.data;
}

export async function checkShift() {
  const response = await api.get(
    "/captain-shifts/current/check"
  );
  return response.data;
}

export async function attendanceIn(captainId: string) {
  const response = await api.post(
    `/requirements/captains/${captainId}/attendance/in`
  );
  return response.data;
}

export async function attendanceOut(captainId: string) {
  const response = await api.post(
    `/requirements/captains/${captainId}/attendance/out`
  );
  return response.data;
}

export async function getAvailableShifts() {
  const response = await api.get("/captain-shifts/available");
  return response.data;
}

export async function selectWeeklyShift(shiftId: string) {
  const response = await api.post(
    "/captain-shifts/weekly/select",
    { shiftId }
  );
  return response.data;
}

export async function changeWeeklyShift(shiftId: string) {
  const response = await api.post(
    "/captain-shifts/weekly/change",
    { shiftId }
  );
  return response.data;
}

export { getMyWorkAreas } from "./captainWorkAreas";


export async function checkCurrentSelectedShift() {
  const response = await api.get(
    "/captain-shifts/current/check"
  );

  return response.data;
}
