// Etiquetas legibles de la actividad. Archivo sin dependencias de servidor (db),
// para poder importarlo desde componentes cliente.

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Inició sesión",
  LOGOUT: "Cerró sesión",
  ORDER_STATUS: "Cambió el estado de un pedido",
  MENU_CATEGORY_CREATE: "Creó una categoría",
  MENU_ITEM_CREATE: "Creó un plato",
  MENU_ITEM_UPDATE: "Editó un plato",
  MENU_ITEM_DELETE: "Eliminó un plato",
  TABLE_CREATE: "Creó una mesa",
  TABLE_UPDATE: "Editó una mesa",
  TABLE_DELETE: "Eliminó una mesa",
  RESTAURANT_CREATE: "Creó un restorán",
  ACCESS_CREATE: "Creó un acceso de personal",
  ACCESS_DELETE: "Eliminó un acceso de personal",
  OPERATIONS_CONFIG: "Cambió el flujo operativo",
  WAITLIST_CALL: "Llamó a un grupo en espera",
  WAITLIST_SEAT: "Sentó a un grupo de la espera",
  WAITLIST_CANCEL: "Quitó a un grupo de la espera",
  WAITLIST_TOGGLE: "Activó/desactivó la lista de espera",
  RESTAURANT_APPROVE: "Aprobó la apertura de un negocio",
  MEMBERSHIP_APPROVE: "Aprobó una membresía",
};

export const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: "Personal",
  PEDIDOS: "Pedidos",
  MENU: "Menú",
  MESAS: "Mesas",
  CUENTA: "Cuenta",
};
