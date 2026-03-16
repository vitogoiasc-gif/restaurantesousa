export type BusinessHoursDay = {
  enabled: boolean;
  open: string;
  close: string;
};

export type BusinessHours = {
  0: BusinessHoursDay;
  1: BusinessHoursDay;
  2: BusinessHoursDay;
  3: BusinessHoursDay;
  4: BusinessHoursDay;
  5: BusinessHoursDay;
  6: BusinessHoursDay;
};

export const defaultBusinessHours: BusinessHours = {
  0: { enabled: false, open: "10:00", close: "14:00" }, // Domingo
  1: { enabled: true, open: "10:00", close: "14:00" },  // Segunda
  2: { enabled: true, open: "10:00", close: "14:00" },  // Terça
  3: { enabled: true, open: "10:00", close: "14:00" },  // Quarta
  4: { enabled: true, open: "10:00", close: "14:00" },  // Quinta
  5: { enabled: true, open: "10:00", close: "14:00" },  // Sexta
  6: { enabled: true, open: "10:00", close: "14:00" },  // Sábado
};

export const weekDays = [
  { key: 0, label: "Domingo" },
  { key: 1, label: "Segunda-feira" },
  { key: 2, label: "Terça-feira" },
  { key: 3, label: "Quarta-feira" },
  { key: 4, label: "Quinta-feira" },
  { key: 5, label: "Sexta-feira" },
  { key: 6, label: "Sábado" },
];

export function normalizeBusinessHours(value: any): BusinessHours {
  return {
    0: {
      enabled: value?.[0]?.enabled ?? defaultBusinessHours[0].enabled,
      open: value?.[0]?.open ?? defaultBusinessHours[0].open,
      close: value?.[0]?.close ?? defaultBusinessHours[0].close,
    },
    1: {
      enabled: value?.[1]?.enabled ?? defaultBusinessHours[1].enabled,
      open: value?.[1]?.open ?? defaultBusinessHours[1].open,
      close: value?.[1]?.close ?? defaultBusinessHours[1].close,
    },
    2: {
      enabled: value?.[2]?.enabled ?? defaultBusinessHours[2].enabled,
      open: value?.[2]?.open ?? defaultBusinessHours[2].open,
      close: value?.[2]?.close ?? defaultBusinessHours[2].close,
    },
    3: {
      enabled: value?.[3]?.enabled ?? defaultBusinessHours[3].enabled,
      open: value?.[3]?.open ?? defaultBusinessHours[3].open,
      close: value?.[3]?.close ?? defaultBusinessHours[3].close,
    },
    4: {
      enabled: value?.[4]?.enabled ?? defaultBusinessHours[4].enabled,
      open: value?.[4]?.open ?? defaultBusinessHours[4].open,
      close: value?.[4]?.close ?? defaultBusinessHours[4].close,
    },
    5: {
      enabled: value?.[5]?.enabled ?? defaultBusinessHours[5].enabled,
      open: value?.[5]?.open ?? defaultBusinessHours[5].open,
      close: value?.[5]?.close ?? defaultBusinessHours[5].close,
    },
    6: {
      enabled: value?.[6]?.enabled ?? defaultBusinessHours[6].enabled,
      open: value?.[6]?.open ?? defaultBusinessHours[6].open,
      close: value?.[6]?.close ?? defaultBusinessHours[6].close,
    },
  };
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function getTodayDayIndex() {
  return new Date().getDay();
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isInsideTimeRange(open: string, close: string, nowMinutes: number) {
  const openMinutes = timeToMinutes(open);
  const closeMinutes = timeToMinutes(close);

  if (openMinutes === closeMinutes) {
    return false;
  }

  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}

export function getTodayHoursLabel(businessHours: any) {
  const normalized = normalizeBusinessHours(businessHours);
  const today = getTodayDayIndex();
  const todayConfig = normalized[today as keyof BusinessHours];

  if (!todayConfig.enabled) {
    return "Fechado hoje";
  }

  return `${formatTime(todayConfig.open)} às ${formatTime(todayConfig.close)}`;
}

export function getRestaurantStatus(settings: any) {
  const manualEnabled = settings?.accepting_orders ?? true;
  const automaticEnabled = settings?.automatic_schedule_enabled ?? false;
  const businessHours = normalizeBusinessHours(settings?.business_hours);
  const nowMinutes = getNowMinutes();
  const today = getTodayDayIndex();
  const yesterday = today === 0 ? 6 : today - 1;

  if (!manualEnabled) {
    return {
      isOpen: false,
      message: "Fechado manualmente pelo admin",
    };
  }

  if (!automaticEnabled) {
    return {
      isOpen: true,
      message: "Aceitando pedidos",
    };
  }

  const yesterdayConfig = businessHours[yesterday as keyof BusinessHours];
  const todayConfig = businessHours[today as keyof BusinessHours];

  if (yesterdayConfig.enabled) {
    const yesterdayOpen = timeToMinutes(yesterdayConfig.open);
    const yesterdayClose = timeToMinutes(yesterdayConfig.close);

    const crossedMidnight = yesterdayClose <= yesterdayOpen;

    if (crossedMidnight && nowMinutes < yesterdayClose) {
      return {
        isOpen: true,
        message: `Aberto agora • fecha às ${formatTime(yesterdayConfig.close)}`,
      };
    }
  }

  if (!todayConfig.enabled) {
    return {
      isOpen: false,
      message: "Fechado hoje",
    };
  }

  const isOpenNow = isInsideTimeRange(
    todayConfig.open,
    todayConfig.close,
    nowMinutes
  );

  if (isOpenNow) {
    return {
      isOpen: true,
      message: `Aberto agora • fecha às ${formatTime(todayConfig.close)}`,
    };
  }

  return {
    isOpen: false,
    message: `Fechado agora • abre às ${formatTime(todayConfig.open)}`,
  };
}